const ayRepo = require('./academic-year.repository');
const { getUserLocationScope, assertLocationAllowed } = require('../../../shared/helpers/location-scope.helper');
const { validate } = require('../../../shared/helpers/validate.helper');

const AY_RULES = {
  location_id:   { required: true, label: 'Location' },
  academic_year: { required: true, min: 9, max: 9, label: 'Academic Year' },
  start_date:    { required: true, label: 'Start Date' },
  end_date:      { required: true, label: 'End Date' },
  notes:         { max: 500, label: 'Notes' },
};

/**
 * Enforce `YYYY-YYYY` where the second year is exactly the first + 1.
 * Mirrors the frontend's `academicYearFormat` validator so both sides refuse
 * the same garbage and the user gets the same message either way.
 */
function validateAcademicYearFormat(value) {
  const match = /^(\d{4})-(\d{4})$/.exec(String(value || ''));
  if (!match) return 'Academic Year must be in YYYY-YYYY format (e.g. 2025-2026)';
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end !== start + 1) return 'End year must be exactly one year after the start year (e.g. 2025-2026)';
  return null;
}

async function getAll(query, userId) {
  const scope = await getUserLocationScope(userId);
  return ayRepo.findAll(query, scope);
}

async function getById(id, userId) {
  const scope = await getUserLocationScope(userId);
  const record = await ayRepo.findById(id, scope);
  if (!record) return { error: 'notFound', message: 'Academic year not found' };
  return { data: record };
}

async function create(body, userId) {
  const errors = validate(body, AY_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };
  const formatError = validateAcademicYearFormat(body.academic_year);
  if (formatError) return { error: 'badRequest', message: formatError };
  if (new Date(body.end_date) <= new Date(body.start_date)) {
    return { error: 'badRequest', message: 'End date must be after start date' };
  }

  const scope = await getUserLocationScope(userId);
  const scopeError = assertLocationAllowed(scope, body.location_id);
  if (scopeError) return scopeError;

  const exists = await ayRepo.checkUnique(body.location_id, body.academic_year);
  if (exists) return { error: 'conflict', message: 'This academic year already exists for the selected location' };

  // Overlap guard — two academic years at the same location shouldn't
  // cover overlapping periods. Strict overlap only (adjacent ranges where
  // one ends the same day the next starts is still allowed).
  const overlap = await ayRepo.findOverlap(body.location_id, body.start_date, body.end_date);
  if (overlap) {
    return { error: 'conflict', message: `Date range overlaps with existing academic year ${overlap.academic_year} at this location` };
  }

  // Honor "only one default per location" before the insert so the partial
  // unique index never fires — keeps error messages useful, not Postgres-y.
  if (body.is_default) {
    await ayRepo.clearOtherDefaults(body.location_id);
  }

  const record = await ayRepo.create(body, userId);
  return { data: record };
}

async function update(id, body, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await ayRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Academic year not found' };

  const merged = { ...current, ...body };
  const errors = validate(merged, AY_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };
  const formatError = validateAcademicYearFormat(merged.academic_year);
  if (formatError) return { error: 'badRequest', message: formatError };
  if (new Date(merged.end_date) <= new Date(merged.start_date)) {
    return { error: 'badRequest', message: 'End date must be after start date' };
  }

  const scopeError = assertLocationAllowed(scope, merged.location_id);
  if (scopeError) return scopeError;

  const targetLocation = body.location_id || current.location_id;
  if (body.academic_year && body.academic_year.toLowerCase() !== current.academic_year.toLowerCase()) {
    const exists = await ayRepo.checkUnique(targetLocation, body.academic_year, id);
    if (exists) return { error: 'conflict', message: 'This academic year already exists for the selected location' };
  }

  const overlap = await ayRepo.findOverlap(targetLocation, merged.start_date, merged.end_date, id);
  if (overlap) {
    return { error: 'conflict', message: `Date range overlaps with existing academic year ${overlap.academic_year} at this location` };
  }

  if (merged.is_default) {
    await ayRepo.clearOtherDefaults(targetLocation, id);
  }

  const record = await ayRepo.update(id, body, current, userId);
  return { data: record };
}

async function remove(id, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await ayRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Academic year not found' };
  await ayRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const scope = await getUserLocationScope(userId);
  const deletedCount = await ayRepo.softDeleteMultiple(ids, userId, scope);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
