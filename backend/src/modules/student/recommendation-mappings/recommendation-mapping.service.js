const mappingRepo = require('./recommendation-mapping.repository');
const profileRepo = require('../student-profiles/student-profile.repository');
const recommenderRepo = require('../recommenders/recommender.repository');
const { validate } = require('../../../shared/helpers/validate.helper');

const MAPPING_RULES = {
  recommender_id: { required: true, label: 'Recommender' },
  notes:          { max: 500,       label: 'Notes' },
};

async function assertProfileExists(profileId) {
  const profile = await profileRepo.findById(profileId, null);
  if (!profile) return { error: 'notFound', message: 'Student profile not found' };
  return { profile };
}

async function getAll(profileId, query) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  return mappingRepo.findAll(profileId, query);
}

async function getById(profileId, id) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const mapping = await mappingRepo.findById(id, profileId);
  if (!mapping) return { error: 'notFound', message: 'Recommendation mapping not found' };
  return { data: mapping };
}

async function create(profileId, body, userId) {
  const errors = validate(body, MAPPING_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  const recommender = await recommenderRepo.findById(body.recommender_id);
  if (!recommender) return { error: 'notFound', message: 'Recommender not found' };

  const id = await mappingRepo.create(profileId, body, userId);
  const created = await mappingRepo.findById(id, profileId);
  return { data: created };
}

async function update(profileId, id, body, userId) {
  const errors = validate(body, MAPPING_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const check = await assertProfileExists(profileId);
  if (check.error) return check;

  const existing = await mappingRepo.findById(id, profileId);
  if (!existing) return { error: 'notFound', message: 'Recommendation mapping not found' };

  const recommender = await recommenderRepo.findById(body.recommender_id);
  if (!recommender) return { error: 'notFound', message: 'Recommender not found' };

  await mappingRepo.update(id, profileId, body, userId);
  const updated = await mappingRepo.findById(id, profileId);
  return { data: updated };
}

async function remove(profileId, id, userId) {
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  const existing = await mappingRepo.findById(id, profileId);
  if (!existing) return { error: 'notFound', message: 'Recommendation mapping not found' };
  await mappingRepo.softDelete(id, profileId, userId);
  return { data: null };
}

async function removeMultiple(profileId, ids, userId) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'No IDs provided' };
  }
  const check = await assertProfileExists(profileId);
  if (check.error) return check;
  await mappingRepo.softDeleteMultiple(ids, profileId, userId);
  return { deleted_count: ids.length };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
