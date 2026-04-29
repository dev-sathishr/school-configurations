const profileRepo = require('./student-profile.repository');
const relationRepo = require('../../employee/employee-info/employee-family/relation.repository');
const { validate } = require('../../../shared/helpers/validate.helper');
const { generateNextCode } = require('../../../shared/helpers/sequence.helper');
const { getUserLocationScope, assertLocationAllowed } = require('../../../shared/helpers/location-scope.helper');
const userRepo = require('../../settings/users/user.repository');
const { saveAddresses, getAddresses } = require('../../../shared/helpers/address.helper');

const ENTITY_TYPE = 'student_profile';

async function saveFamilyMembers(profileId, members, userId) {
  if (!members || !Array.isArray(members) || members.length === 0) return;
  for (const m of members) {
    const row = await relationRepo.create(ENTITY_TYPE, profileId, m, userId);
    if (m.addresses?.length) {
      const { saveAddresses: sa } = require('../../../shared/helpers/address.helper');
      await sa('relation', row.relation_id, m.addresses, userId);
    }
  }
}

const PROFILE_RULES = {
  first_name:           { required: true, min: 2, max: 100, label: 'First Name' },
  middle_name:          { max: 100,                    label: 'Middle Name' },
  last_name:            { max: 100,                    label: 'Last Name' },
  dob:                  {                              label: 'Date of Birth' },
  gender:               {                              label: 'Gender' },
  aadhaar_no:           { max: 12,                     label: 'Aadhaar Number' },
  mother_tongue:        { max: 100,                    label: 'Mother Tongue' },
  religion:             { max: 100,                    label: 'Religion' },
  community:            { max: 100,                    label: 'Community' },
  caste:                { max: 100,                    label: 'Caste' },
  nationality:          { max: 100,                    label: 'Nationality' },
  birth_place:          { max: 100,                    label: 'Birth Place' },
  primary_contact_no:   { max: 20,                     label: 'Contact Number' },
  email:                { max: 100, email: true,        label: 'Email' },
  notes:                { max: 500,                    label: 'Notes' },
};

async function getAll(query, userId) {
  const scope = await getUserLocationScope(userId);
  return profileRepo.findAll(query, scope);
}

async function getById(id, userId) {
  const scope = await getUserLocationScope(userId);
  const profile = await profileRepo.findById(id, scope);
  if (!profile) return { error: 'notFound', message: 'Student profile not found' };
  const addresses = await getAddresses('student_profile', id);
  const family = await relationRepo.findAllByEntity('student_profile', id);
  return { data: { ...profile, addresses, family } };
}

async function resolveLocationId(userId) {
  const rows = await userRepo.getUserLocations(userId);
  if (!rows.length) return null; // unrestricted (super admin) — no location to auto-assign
  const defaultRow = rows.find((r) => r.is_default) || rows[0];
  return defaultRow.id;
}

async function create(body, userId) {
  const errors = validate(body, PROFILE_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Auto-assign location from user's default permitted location
  const locationId = body.location_id || (await resolveLocationId(userId));
  if (!locationId) return { error: 'badRequest', message: 'No location assigned to your account' };
  body = { ...body, location_id: locationId };

  const scope = await getUserLocationScope(userId);
  const scopeError = assertLocationAllowed(scope, body.location_id);
  if (scopeError) return scopeError;

  if (body.aadhaar_no) {
    const exists = await profileRepo.checkAadhaarUnique(body.aadhaar_no);
    if (exists) return { error: 'conflict', message: 'Aadhaar number is already registered' };
  }

  const profileNo = await generateNextCode('STUDENT_PROFILE', body.location_id);
  if (profileNo.error) return { error: 'badRequest', message: profileNo.error };

  const id = await profileRepo.create({ ...body, profile_no: profileNo.code }, userId);
  if (body.addresses?.length) {
    await saveAddresses('student_profile', id, body.addresses, userId);
  }
  if (body.family?.length) {
    await saveFamilyMembers(id, body.family, userId);
  }
  return getById(id, userId);
}

async function update(id, body, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await profileRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Student profile not found' };

  const merged = { ...current, ...body };
  const errors = validate(merged, PROFILE_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.aadhaar_no && body.aadhaar_no !== current.aadhaar_no) {
    const exists = await profileRepo.checkAadhaarUnique(body.aadhaar_no, id);
    if (exists) return { error: 'conflict', message: 'Aadhaar number is already registered' };
  }

  const updated = await profileRepo.update(id, body, userId);
  if (!updated) return { error: 'notFound', message: 'Student profile not found' };
  if (body.addresses && Array.isArray(body.addresses)) {
    await saveAddresses('student_profile', id, body.addresses, userId);
  }
  return getById(id, userId);
}

async function remove(id, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await profileRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Student profile not found' };
  await profileRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const scope = await getUserLocationScope(userId);
  const deletedCount = await profileRepo.softDeleteMultiple(ids, userId, scope);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
