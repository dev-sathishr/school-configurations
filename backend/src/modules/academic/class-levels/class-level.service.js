const levelRepo = require('./class-level.repository');
const { getUserLocationScope, assertLocationAllowed } = require('../../../shared/helpers/location-scope.helper');
const { validate } = require('../../../shared/helpers/validate.helper');

const LEVEL_RULES = {
  location_id: { required: true, label: 'Location' },
  class_general_id: { required: true, label: 'Class' },
  code: { required: true, min: 1, max: 100, label: 'Code' },
  notes: { max: 500, label: 'Notes' },
};

async function getAll(query, userId) {
  const scope = await getUserLocationScope(userId);
  return levelRepo.findAll(query, scope);
}

async function getById(id, userId) {
  const scope = await getUserLocationScope(userId);
  const level = await levelRepo.findById(id, scope);
  if (!level) return { error: 'notFound', message: 'Class level not found' };
  return { data: level };
}

async function create(body, userId) {
  const errors = validate(body, LEVEL_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const scope = await getUserLocationScope(userId);
  const scopeError = assertLocationAllowed(scope, body.location_id);
  if (scopeError) return scopeError;

  const exists = await levelRepo.checkUnique(body.class_general_id, body.code);
  if (exists) return { error: 'conflict', message: 'Code already exists for this class' };

  const level = await levelRepo.create(body, userId);
  return { data: level };
}

async function update(id, body, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await levelRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Class level not found' };

  const merged = { ...current, ...body };
  const errors = validate(merged, LEVEL_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Re-check: user can't move a record into a location they don't own.
  const scopeError = assertLocationAllowed(scope, merged.location_id);
  if (scopeError) return scopeError;

  const classId = body.class_general_id || current.class_general_id;
  if (body.code && body.code.trim().toLowerCase() !== current.code?.toLowerCase()) {
    const exists = await levelRepo.checkUnique(classId, body.code, id);
    if (exists) return { error: 'conflict', message: 'Code already exists for this class' };
  }

  const level = await levelRepo.update(id, body, current, userId);
  return { data: level };
}

async function remove(id, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await levelRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Class level not found' };
  await levelRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const scope = await getUserLocationScope(userId);
  const deletedCount = await levelRepo.softDeleteMultiple(ids, userId, scope);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
