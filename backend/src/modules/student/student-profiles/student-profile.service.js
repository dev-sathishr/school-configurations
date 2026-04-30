const profileRepo = require('./student-profile.repository');
const relationRepo = require('../../employee/employee-info/employee-family/relation.repository');
const fileRepo = require('../../files/file.repository');
const { validate } = require('../../../shared/helpers/validate.helper');
const { getUserLocationScope, assertLocationAllowed } = require('../../../shared/helpers/location-scope.helper');
const userRepo = require('../../settings/users/user.repository');
const { saveAddresses, getAddresses } = require('../../../shared/helpers/address.helper');

const ENTITY_TYPE = 'student_profile';

async function saveFamilyMembers(profileId, members, userId) {
  if (!members || !Array.isArray(members) || members.length === 0) return;
  const emergencyCount = members.filter(m => m.is_emergency_contact).length;
  if (emergencyCount > 1) {
    return { error: 'badRequest', message: 'Only one family member can be marked as emergency contact' };
  }
  for (const m of members) {
    const row = await relationRepo.create(ENTITY_TYPE, profileId, m, userId);
    if (m.addresses?.length) {
      await saveAddresses('relation', row.relation_id, m.addresses, userId);
    }
  }
  return null;
}

const PROFILE_RULES = {
  first_name:           { required: true, min: 2, max: 100, label: 'First Name' },
  middle_name:          { max: 100,                    label: 'Middle Name' },
  last_name:            { max: 100,                    label: 'Last Name' },
  dob:                  {                              label: 'Date of Birth' },
  gender:               {                              label: 'Gender' },
  aadhaar_no:           { max: 12,                     label: 'Aadhaar Number' },
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
  const [addresses, family, photo] = await Promise.all([
    getAddresses(ENTITY_TYPE, id),
    relationRepo.findAllByEntity(ENTITY_TYPE, id),
    fileRepo.findOneByEntity(ENTITY_TYPE, id, 'photo'),
  ]);
  return { data: { ...profile, addresses, family, photo: photo || null } };
}

async function resolveLocationId(userId) {
  const rows = await userRepo.getUserLocations(userId);
  if (!rows.length) return null; // unrestricted (super admin) — no location to auto-assign
  const defaultRow = rows.find((r) => r.is_default) || rows[0];
  return defaultRow.id;
}

async function savePhoto(entityType, entityId, file, userId) {
  await fileRepo.softDeleteByEntity(entityType, entityId, 'photo', userId);
  await fileRepo.create({
    entity_type: entityType,
    entity_id:   entityId,
    file_type:   'photo',
    original_name: file.originalname,
    stored_name:   file.filename,
    mime_type:     file.mimetype,
    size:          file.size,
    path:          `uploads/${file.filename}`,
  }, userId);
}

async function create(body, file, userId) {
  const errors = validate(body, PROFILE_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

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

  const id = await profileRepo.create(body, userId);
  if (body.addresses?.length) await saveAddresses(ENTITY_TYPE, id, body.addresses, userId);
  if (body.family?.length) {
    const familyError = await saveFamilyMembers(id, body.family, userId);
    if (familyError) { await profileRepo.softDelete(id, userId); return familyError; }
  }
  if (file) await savePhoto(ENTITY_TYPE, id, file, userId);
  return getById(id, userId);
}

async function update(id, body, file, userId) {
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
  if (body.addresses && Array.isArray(body.addresses)) await saveAddresses(ENTITY_TYPE, id, body.addresses, userId);
  if (file) await savePhoto(ENTITY_TYPE, id, file, userId);
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
