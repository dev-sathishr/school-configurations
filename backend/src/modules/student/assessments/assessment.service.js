const assessmentRepo = require('./assessment.repository');
const profileRepo    = require('../student-profiles/student-profile.repository');
const enquiryRepo    = require('../enquiries/enquiry.repository');
const { validate }   = require('../../../shared/helpers/validate.helper');
const { generateNextCode, peekNextCode } = require('../../../shared/helpers/sequence.helper');

const VALID_TYPES   = ['oral', 'written', 'oral_re', 'written_re', 'interview', 'other'];
const VALID_RESULTS = ['pass', 'fail', 'pending'];

const ASSESSMENT_RULES = {
  enquiry_id:      { required: true, label: 'Enquiry' },
  assessment_date: { required: true, label: 'Assessment Date' },
  type:            { required: true, label: 'Assessment Type' },
  notes:           { max: 500,       label: 'Notes' },
};

function toId(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.id ? String(value.id).trim() : '';
  return String(value).trim();
}

function normalizeBody(body = {}) {
  return {
    ...body,
    enquiry_id:           toId(body.enquiry_id           || body.enquiry),
    assessed_by_id:       toId(body.assessed_by_id       || body.assessed_by),
    sanctioned_class_id:  toId(body.sanctioned_class_id  || body.sanctioned_class),
    academic_year_id:     toId(body.academic_year_id     || body.academic_year),
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
  return assessmentRepo.findAll(profileId, query);
}

async function getById(profileId, id) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const row = await assessmentRepo.findById(id, profileId);
  if (!row) return { error: 'notFound', message: 'Assessment not found' };
  return { data: row };
}

async function getNextCode(profileId, locationId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const locId = locationId || check.profile.location_id;
  const code = await peekNextCode('ASSESSMENT', locId);
  if (!code) return { error: 'notFound', message: 'No sequence control configured for ASSESSMENT at this location. Please configure it in sequence settings.' };
  return { data: { code } };
}

async function create(profileId, body, userId) {
  const normalized = normalizeBody(body);
  const errors = validate(normalized, ASSESSMENT_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (!VALID_TYPES.includes(normalized.type)) {
    return { error: 'badRequest', message: 'Invalid assessment type' };
  }
  if (normalized.result && !VALID_RESULTS.includes(normalized.result)) {
    return { error: 'badRequest', message: 'Invalid result value' };
  }

  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  // Verify enquiry belongs to this student profile
  const enquiry = await enquiryRepo.findById(normalized.enquiry_id, profileId);
  if (!enquiry) return { error: 'badRequest', message: 'Selected enquiry does not belong to this student' };

  // Date guard: must be on or after the enquiry date and not in the future
  const today = new Date().toISOString().slice(0, 10);
  if (normalized.assessment_date > today) {
    return { error: 'badRequest', message: 'Assessment date cannot be in the future' };
  }
  if (enquiry.enquiry_date && normalized.assessment_date < new Date(enquiry.enquiry_date).toISOString().slice(0, 10)) {
    return { error: 'badRequest', message: 'Assessment date cannot be before the enquiry date' };
  }

  const locationId = check.profile.location_id;
  const seqResult = await generateNextCode('ASSESSMENT', locationId).catch(() => null);
  const assessment_no = seqResult?.code || `ASS-${Date.now()}`;

  const id = await assessmentRepo.create(profileId, { ...normalized, assessment_no }, userId);
  const created = await assessmentRepo.findById(id, profileId);
  return { data: created };
}

async function update(profileId, id, body, userId) {
  const normalized = normalizeBody(body);
  const errors = validate(normalized, ASSESSMENT_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (!VALID_TYPES.includes(normalized.type)) {
    return { error: 'badRequest', message: 'Invalid assessment type' };
  }
  if (normalized.result && !VALID_RESULTS.includes(normalized.result)) {
    return { error: 'badRequest', message: 'Invalid result value' };
  }

  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  const existing = await assessmentRepo.findById(id, profileId);
  if (!existing) return { error: 'notFound', message: 'Assessment not found' };

  const enquiry = await enquiryRepo.findById(normalized.enquiry_id, profileId);
  if (!enquiry) return { error: 'badRequest', message: 'Selected enquiry does not belong to this student' };

  const today = new Date().toISOString().slice(0, 10);
  if (normalized.assessment_date > today) {
    return { error: 'badRequest', message: 'Assessment date cannot be in the future' };
  }
  if (enquiry.enquiry_date && normalized.assessment_date < new Date(enquiry.enquiry_date).toISOString().slice(0, 10)) {
    return { error: 'badRequest', message: 'Assessment date cannot be before the enquiry date' };
  }

  await assessmentRepo.update(id, profileId, normalized, userId);
  const updated = await assessmentRepo.findById(id, profileId);
  return { data: updated };
}

async function remove(profileId, id, userId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const existing = await assessmentRepo.findById(id, profileId);
  if (!existing) return { error: 'notFound', message: 'Assessment not found' };
  await assessmentRepo.softDelete(id, profileId, userId);
  return { data: null };
}

async function removeMultiple(profileId, ids, userId) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'No IDs provided' };
  }
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  await assessmentRepo.softDeleteMultiple(ids, profileId, userId);
  return { deleted_count: ids.length };
}

module.exports = { getAll, getById, getNextCode, create, update, remove, removeMultiple };
