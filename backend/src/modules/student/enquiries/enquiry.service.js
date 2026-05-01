const enquiryRepo = require('./enquiry.repository');
const profileRepo  = require('../student-profiles/student-profile.repository');
const { validate }  = require('../../../shared/helpers/validate.helper');
const { getUserLocationScope, assertLocationAllowed } = require('../../../shared/helpers/location-scope.helper');
const { generateNextCode, peekNextCode } = require('../../../shared/helpers/sequence.helper');

const VALID_STATUSES    = ['open', 'follow_up', 'converted', 'closed', 'cancelled'];
const VALID_RELATION_TYPES = [
  'father','mother','spouse','son','daughter','brother','sister',
  'guardian','legal_guardian','grandfather','grandmother','grandson','granddaughter',
  'uncle','aunt','nephew','niece',
  'stepfather','stepmother','stepson','stepdaughter',
  'father_in_law','mother_in_law','other',
];

const ENQUIRY_RULES = {
  academic_year_id:    { required: true,                   label: 'Academic Year' },
  enquiry_date:        { required: true,                   label: 'Enquiry Date' },
  enquired_by:         { required: true, min: 3, max: 100, label: 'Enquired By' },
  relation_type:       { required: true,                   label: 'Relation Type' },
  contact_no:          { required: true, min: 7, max: 15,  label: 'Contact Number' },
  enquired_class:      { required: true, max: 100,         label: 'Enquired Class' },
  current_school:      { max: 100,                         label: 'Current School' },
  current_class:       { max: 100,                         label: 'Current Class' },
  current_curriculum:  { max: 100,                         label: 'Current Curriculum' },
  notes:               { max: 500,                         label: 'Notes' },
};

function toId(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.id ? String(value.id).trim() : '';
  return String(value).trim();
}

function normalizeBody(body = {}) {
  const academicYearId = toId(body.academic_year_id || body.academic_year);
  const enquiredClassId = toId(body.enquired_class_id || body.enquired_class);
  const curriculumId = toId(body.current_curriculum_id || body.current_curriculum);
  const locationId = toId(body.location_id || body.location);

  return {
    ...body,
    academic_year_id: academicYearId,
    enquired_class: enquiredClassId,
    enquired_class_id: enquiredClassId,
    current_curriculum: curriculumId,
    current_curriculum_id: curriculumId,
    location_id: locationId,
  };
}

async function getNextCode(profileId, locationId, userId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const locId = locationId || check.profile.location_id;
  const code = await peekNextCode('ENQUIRY', locId);
  if (!code) return { error: 'notFound', message: 'No sequence control configured for ENQUIRY at this location. Please configure it in sequence settings.' };
  return { data: { code } };
}

async function assertProfileExists(profileId) {
  const profile = await profileRepo.findById(profileId, null);
  if (!profile) return { error: 'notFound', message: 'Student profile not found' };
  return { profile };
}

async function getAll(profileId, query, userId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  return enquiryRepo.findAll(profileId, query);
}

async function getById(profileId, id, userId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  const enquiry = await enquiryRepo.findById(id, profileId);
  if (!enquiry) return { error: 'notFound', message: 'Enquiry not found' };
  return { data: enquiry };
}

async function create(profileId, body, userId) {
  const normalized = normalizeBody(body);
  const errors = validate(normalized, ENQUIRY_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (normalized.status && !VALID_STATUSES.includes(normalized.status)) {
    return { error: 'badRequest', message: 'Invalid status value' };
  }
  if (!VALID_RELATION_TYPES.includes(normalized.relation_type)) {
    return { error: 'badRequest', message: 'Invalid relation type' };
  }

  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  // Generate enquiry_no via sequence (falls back to timestamp if no sequence configured)
  const scope = await getUserLocationScope(userId);
  const locationId = check.profile.location_id;
  const seqResult = await generateNextCode('ENQUIRY', locationId).catch(() => null);
  const enquiry_no = seqResult?.code || `ENQ-${Date.now()}`;

  await enquiryRepo.closeActiveEnquiries(profileId, userId);
  const id = await enquiryRepo.create(profileId, { ...normalized, enquiry_no }, userId);
  await profileRepo.updateStatus(profileId, 'enquiry', userId);
  const created = await enquiryRepo.findById(id, profileId);
  return { data: created };
}

async function update(profileId, id, body, userId) {
  const normalized = normalizeBody(body);
  const errors = validate(normalized, ENQUIRY_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (normalized.status && !VALID_STATUSES.includes(normalized.status)) {
    return { error: 'badRequest', message: 'Invalid status value' };
  }
  if (!VALID_RELATION_TYPES.includes(normalized.relation_type)) {
    return { error: 'badRequest', message: 'Invalid relation type' };
  }

  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  const existing = await enquiryRepo.findById(id, profileId);
  if (!existing) return { error: 'notFound', message: 'Enquiry not found' };

  await enquiryRepo.update(id, profileId, normalized, userId);
  const updated = await enquiryRepo.findById(id, profileId);
  return { data: updated };
}

async function remove(profileId, id, userId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  const existing = await enquiryRepo.findById(id, profileId);
  if (!existing) return { error: 'notFound', message: 'Enquiry not found' };

  await enquiryRepo.softDelete(id, profileId, userId);
  return { data: null };
}

async function removeMultiple(profileId, ids, userId) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'No IDs provided' };
  }
  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  await enquiryRepo.softDeleteMultiple(ids, profileId, userId);
  return { deleted_count: ids.length };
}

module.exports = { getAll, getById, getNextCode, create, update, remove, removeMultiple };
