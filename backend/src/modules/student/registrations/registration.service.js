const registrationRepo = require('./registration.repository');
const profileRepo      = require('../student-profiles/student-profile.repository');
const enquiryRepo      = require('../enquiries/enquiry.repository');
const { validate }     = require('../../../shared/helpers/validate.helper');
const { generateNextCode, peekNextCode } = require('../../../shared/helpers/sequence.helper');

const REGISTRATION_RULES = {
  enquiry_id:          { required: true, label: 'Enquiry' },
  registration_date:   { required: true, label: 'Registration Date' },
  sanctioned_class_id: { required: true, label: 'Sanctioned Class' },
  academic_year_id:    { required: true, label: 'Academic Year' },
  notes:               { max: 500,       label: 'Notes' },
};

function toId(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.id ? String(value.id).trim() : '';
  return String(value).trim();
}

function normalizeBody(body = {}) {
  return {
    ...body,
    enquiry_id:          toId(body.enquiry_id          || body.enquiry),
    sanctioned_class_id: toId(body.sanctioned_class_id || body.sanctioned_class),
    academic_year_id:    toId(body.academic_year_id    || body.academic_year),
  };
}

async function assertProfileExists(profileId) {
  const profile = await profileRepo.findById(profileId, null);
  if (!profile) return { error: 'notFound', message: 'Student profile not found' };
  return { profile };
}

async function getAll(profileId, query) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  return registrationRepo.findAll(profileId, query);
}

async function getById(profileId, id) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const row = await registrationRepo.findById(id, profileId);
  if (!row) return { error: 'notFound', message: 'Registration not found' };
  return { data: row };
}

async function getNextCode(profileId, locationId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const locId = locationId || check.profile.location_id;
  const code = await peekNextCode('REGISTRATION', locId);
  if (!code) return { error: 'notFound', message: 'No sequence control configured for REGISTRATION at this location. Please configure it in sequence settings.' };
  return { data: { code } };
}

async function validateAgainstEnquiry(profileId, normalized) {
  const enquiry = await enquiryRepo.findById(normalized.enquiry_id, profileId);
  if (!enquiry) return { error: 'badRequest', message: 'Selected enquiry does not belong to this student' };

  const today = new Date().toISOString().slice(0, 10);
  if (normalized.registration_date > today) {
    return { error: 'badRequest', message: 'Registration date cannot be in the future' };
  }
  if (enquiry.enquiry_date && normalized.registration_date < new Date(enquiry.enquiry_date).toISOString().slice(0, 10)) {
    return { error: 'badRequest', message: 'Registration date cannot be before the enquiry date' };
  }
  return { enquiry };
}

async function create(profileId, body, userId) {
  const normalized = normalizeBody(body);
  const errors = validate(normalized, REGISTRATION_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  const enqCheck = await validateAgainstEnquiry(profileId, normalized);
  if (enqCheck.error) return enqCheck;

  const conflict = await registrationRepo.checkConflict(profileId, normalized.enquiry_id, normalized.sanctioned_class_id);
  if (conflict) {
    return { error: 'conflict', message: 'A registration already exists for this enquiry and class' };
  }

  const locationId = check.profile.location_id;
  const seqResult = await generateNextCode('REGISTRATION', locationId).catch(() => null);
  const registration_no = seqResult?.code || `REG-${Date.now()}`;

  const id = await registrationRepo.create(profileId, { ...normalized, registration_no }, userId);
  const created = await registrationRepo.findById(id, profileId);
  return { data: created };
}

async function update(profileId, id, body, userId) {
  const normalized = normalizeBody(body);
  const errors = validate(normalized, REGISTRATION_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  const existing = await registrationRepo.findById(id, profileId);
  if (!existing) return { error: 'notFound', message: 'Registration not found' };

  const enqCheck = await validateAgainstEnquiry(profileId, normalized);
  if (enqCheck.error) return enqCheck;

  const conflict = await registrationRepo.checkConflict(profileId, normalized.enquiry_id, normalized.sanctioned_class_id, id);
  if (conflict) {
    return { error: 'conflict', message: 'Another registration already exists for this enquiry and class' };
  }

  await registrationRepo.update(id, profileId, normalized, userId);
  const updated = await registrationRepo.findById(id, profileId);
  return { data: updated };
}

async function remove(profileId, id, userId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const existing = await registrationRepo.findById(id, profileId);
  if (!existing) return { error: 'notFound', message: 'Registration not found' };
  await registrationRepo.softDelete(id, profileId, userId);
  return { data: null };
}

async function removeMultiple(profileId, ids, userId) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'No IDs provided' };
  }
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  await registrationRepo.softDeleteMultiple(ids, profileId, userId);
  return { deleted_count: ids.length };
}

module.exports = { getAll, getById, getNextCode, create, update, remove, removeMultiple };
