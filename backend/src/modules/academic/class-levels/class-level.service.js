const levelRepo = require('./class-level.repository');
const { getUserLocationScope, assertLocationAllowed } = require('../../../shared/helpers/location-scope.helper');
const { validate } = require('../../../shared/helpers/validate.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

const LEVEL_RULES = {
  location_id: { required: true, label: 'Location' },
  class_general_id: { required: true, label: 'Class' },
  name: { required: true, min: 2, max: 200, label: 'Name' },
  code: { required: true, min: 1, max: 100, label: 'Code' },
  notes: { max: 500, label: 'Notes' },
};

function mapClassLevel(level) {
  if (!level) return level;
  const {
    class_general_id, class_name, class_code,
    location_id, location_name, location_code,
    ...rest
  } = level;
  return {
    ...rest,
    class_general: class_general_id
      ? { id: class_general_id, name: class_name || '', code: class_code || '' }
      : null,
    location: location_id
      ? { id: location_id, name: location_name || '', code: location_code || '' }
      : null,
  };
}

async function getAll(query, userId) {
  const scope = await getUserLocationScope(userId);
  const result = await levelRepo.findAll(query, scope);
  result.data = (result.data || []).map(mapClassLevel);
  return result;
}

async function getById(id, userId) {
  const scope = await getUserLocationScope(userId);
  const level = await levelRepo.findById(id, scope);
  if (!level) return { error: 'notFound', message: 'Class level not found' };
  return { data: mapClassLevel(level) };
}

async function validateCapacity(classGeneralId, capacity, excludeId = null) {
  const cap = parseInt(capacity, 10) || 0;
  if (cap <= 0) return null;
  const strength = await levelRepo.getClassStrength(classGeneralId);
  if (strength <= 0) return null;
  const alreadyAllocated = await levelRepo.getTotalAllocatedCapacity(classGeneralId, excludeId);
  const newTotal = alreadyAllocated + cap;
  if (newTotal > strength) {
    const remaining = strength - alreadyAllocated;
    return {
      error: 'badRequest',
      message: `Total capacity for this class would be ${newTotal}, which exceeds the class strength of ${strength}. Only ${remaining} remaining.`,
    };
  }
  return null;
}

async function create(body, userId) {
  const errors = validate(body, LEVEL_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const scope = await getUserLocationScope(userId);
  const scopeError = assertLocationAllowed(scope, body.location_id);
  if (scopeError) return scopeError;

  const capacityError = await validateCapacity(body.class_general_id, body.capacity);
  if (capacityError) return capacityError;

  const exists = await levelRepo.checkUnique(body.class_general_id, body.location_id, body.code);
  if (exists) return { error: 'conflict', message: 'Code already exists for this class in this location' };

  const level = await levelRepo.create(body, userId);
  return getById(level.id, userId);
}

async function update(id, body, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await levelRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Class level not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  const merged = { ...current, ...body };
  const errors = validate(merged, LEVEL_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Re-check: user can't move a record into a location they don't own.
  const scopeError = assertLocationAllowed(scope, merged.location_id);
  if (scopeError) return scopeError;

  const classId = body.class_general_id || current.class_general_id;
  const capacityToCheck = body.capacity !== undefined ? body.capacity : current.capacity;
  const capacityError = await validateCapacity(classId, capacityToCheck, id);
  if (capacityError) return capacityError;

  if (body.code && body.code.trim().toLowerCase() !== current.code?.toLowerCase()) {
    const locationId = body.location_id || current.location_id;
    const exists = await levelRepo.checkUnique(classId, locationId, body.code, id);
    if (exists) return { error: 'conflict', message: 'Code already exists for this class in this location' };
  }

  const level = await levelRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(level);
  if (stale) return stale;

  return getById(id, userId);
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
