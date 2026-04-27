const employeeRepo = require('./employee.repository');
const fileRepo = require('../../files/file.repository');
const { validate } = require('../../../shared/helpers/validate.helper');
const { saveAddresses, getAddresses } = require('../../../shared/helpers/address.helper');
const { getUserLocationScope, assertLocationAllowed } = require('../../../shared/helpers/location-scope.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');
const { generateNextCode, peekNextCode } = require('../../../shared/helpers/sequence.helper');

const VALID_GENDERS = ['male', 'female', 'other'];
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const VALID_MARITAL = ['single', 'married', 'divorced', 'widowed'];
const VALID_RELIGIONS = ['hindu', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'other'];
const VALID_COMMUNITIES = ['general', 'obc', 'sc', 'st', 'other'];

const EMPLOYEE_RULES = {
  employee_name:    { required: true, min: 2, max: 200, label: 'Employee Name' },
  display_name:     { max: 200, label: 'Display Name' },
  employee_code:    { required: true, min: 1, max: 50,  label: 'Employee Code' },
  aadhaar_no:       { max: 12, label: 'Aadhaar No' },
  email:            { max: 100, email: true, label: 'Email' },
  notes:            { max: 500, label: 'Notes' },
};

function mapEmployee(row) {
  if (!row) return row;
  const {
    location_id, location_name, location_code,
    designation_id, designation_name, designation_code,
    employee_group_name, employee_group_code,
    employee_category_name, employee_category_code,
    ...rest
  } = row;
  return {
    ...rest,
    location: location_id ? { id: location_id, name: location_name || '', code: location_code || '' } : null,
    designation: designation_id
      ? {
          id: designation_id,
          name: designation_name || '',
          code: designation_code || '',
          employee_group: employee_group_name
            ? { name: employee_group_name, code: employee_group_code || '' }
            : null,
          employee_category: employee_category_name
            ? { name: employee_category_name, code: employee_category_code || '' }
            : null,
        }
      : null,
  };
}

async function getAll(query, userId) {
  const scope = await getUserLocationScope(userId);
  const result = await employeeRepo.findAll(query, scope);
  result.data = (result.data || []).map(mapEmployee);
  return result;
}

async function getById(id, userId) {
  const scope = await getUserLocationScope(userId);
  const employee = await employeeRepo.findById(id, scope);
  if (!employee) return { error: 'notFound', message: 'Employee not found' };

  const [addresses, photo] = await Promise.all([
    getAddresses('employee', id),
    fileRepo.findOneByEntity('employee', id, 'photo'),
  ]);

  return { data: { ...mapEmployee(employee), addresses, photo: photo || null } };
}

async function getNextCode(locationId, userId) {
  if (!locationId) return { error: 'badRequest', message: 'location_id is required' };
  const scope = await getUserLocationScope(userId);
  const scopeError = assertLocationAllowed(scope, locationId);
  if (scopeError) return scopeError;
  const code = await peekNextCode('EMPLOYEE', locationId);
  if (!code) return { error: 'notFound', message: 'No sequence control configured for EMPLOYEE at this location. Please configure it in sequence settings.' };
  return { data: { code } };
}

async function getDropdown(query, userId) {
  const scope = await getUserLocationScope(userId);
  return employeeRepo.getDropdown(query, scope);
}

function validateEnumFields(body) {
  const errors = [];
  if (body.gender && !VALID_GENDERS.includes(body.gender)) errors.push('Invalid gender value');
  if (body.blood_group && !VALID_BLOOD_GROUPS.includes(body.blood_group)) errors.push('Invalid blood group value');
  if (body.marital_status && !VALID_MARITAL.includes(body.marital_status)) errors.push('Invalid marital status value');
  if (body.religion && !VALID_RELIGIONS.includes(body.religion)) errors.push('Invalid religion value');
  if (body.community && !VALID_COMMUNITIES.includes(body.community)) errors.push('Invalid community value');
  if (body.aadhaar_no && !/^\d{12}$/.test(body.aadhaar_no)) errors.push('Aadhaar No must be exactly 12 digits');
  return errors;
}

async function create(body, userId) {
  // Validate everything except employee_code — it's system-generated
  const rulesWithoutCode = { ...EMPLOYEE_RULES };
  delete rulesWithoutCode.employee_code;
  const errors = validate(body, rulesWithoutCode);
  errors.push(...validateEnumFields(body));
  if (!body.location_id)    errors.push('Location is required');
  if (!body.designation_id) errors.push('Designation is required');
  if (!body.gender)         errors.push('Gender is required');
  if (!body.dob)            errors.push('Date of Birth is required');
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const scope = await getUserLocationScope(userId);
  const scopeError = assertLocationAllowed(scope, body.location_id);
  if (scopeError) return scopeError;

  // Atomically claim the next code — safe under concurrent requests
  const generated = await generateNextCode('EMPLOYEE', body.location_id);
  if (generated.error) return generated;

  const employee = await employeeRepo.create({ ...body, employee_code: generated.code }, userId);
  if (body.addresses && body.addresses.length > 0) {
    await saveAddresses('employee', employee.id, body.addresses, userId);
  }

  return getById(employee.id, userId);
}

async function update(id, body, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await employeeRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Employee not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  const merged = { ...current, ...body };
  const errors = validate(merged, EMPLOYEE_RULES);
  errors.push(...validateEnumFields(body));
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const newLocationId = body.location_id || current.location_id;
  const locationError = assertLocationAllowed(scope, newLocationId);
  if (locationError) return locationError;

  const newCode = body.employee_code || current.employee_code;
  if (
    newCode.toLowerCase() !== current.employee_code.toLowerCase() ||
    newLocationId !== current.location_id
  ) {
    const dup = await employeeRepo.findByCodeAndLocation(newCode, newLocationId, id);
    if (dup) return { error: 'conflict', message: 'Employee code already exists for this location' };
  }

  const updated = await employeeRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(updated);
  if (stale) return stale;

  if (body.addresses) {
    await saveAddresses('employee', id, body.addresses, userId);
  }

  return getById(id, userId);
}

async function assertNotLinkedToUser(ids) {
  const db = require('../../../config/database');
  const result = await db.query(
    `SELECT u.full_name, u.username FROM settings.users u
     WHERE u.person_id = ANY($1::uuid[]) AND u.deleted_at IS NULL LIMIT 1`,
    [ids]
  );
  if (result.rows.length > 0) {
    const u = result.rows[0];
    return { error: 'conflict', message: `This employee is linked to user account "${u.full_name} (${u.username})". Remove the user account link before deleting.` };
  }
  return null;
}

async function remove(id, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await employeeRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Employee not found' };

  const linkErr = await assertNotLinkedToUser([id]);
  if (linkErr) return linkErr;

  await employeeRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }

  const linkErr = await assertNotLinkedToUser(ids);
  if (linkErr) return { error: 'conflict', message: 'One or more selected employees are linked to user accounts. Remove the user account links before deleting.' };

  const scope = await getUserLocationScope(userId);
  const deletedCount = await employeeRepo.softDeleteMultiple(ids, userId, scope);
  return { deleted_count: deletedCount };
}

async function getLinkableDropdown(query) {
  return employeeRepo.getLinkableDropdown({
    page: parseInt(query.page) || 1,
    size: parseInt(query.size) || 20,
    search: query.search || '',
    excludeUserId: query.exclude_user_id || null,
  });
}

module.exports = { getAll, getById, getNextCode, getDropdown, getLinkableDropdown, create, update, remove, removeMultiple };
