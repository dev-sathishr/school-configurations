const sequenceControlRepo = require('./sequence-control.repository');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../../shared/helpers/optimistic-lock.helper');

function mapControl(row) {
  if (!row) return null;
  const {
    sequence_code_id, sequence_code_code, sequence_code_name,
    location_id, location_name, location_code,
    ...rest
  } = row;
  return {
    ...rest,
    sequence_code: {
      id: sequence_code_id,
      code: sequence_code_code,
      name: sequence_code_name,
    },
    location: {
      id: location_id,
      name: location_name,
      code: location_code,
    },
  };
}

async function getAll(query) {
  const result = await sequenceControlRepo.findAll(query);
  return {
    ...result,
    data: (result.data || []).map(mapControl),
  };
}

async function getById(id) {
  const row = await sequenceControlRepo.findById(id);
  if (!row) return { error: 'notFound', message: 'Sequence control not found' };
  return { data: mapControl(row) };
}

async function create(body, userId) {
  const { sequence_code_id, location_id, digit_length } = body;

  if (!sequence_code_id) return { error: 'badRequest', message: 'Sequence code is required' };
  if (!location_id) return { error: 'badRequest', message: 'Location is required' };
  if (!digit_length) return { error: 'badRequest', message: 'Digit length is required' };

  if (digit_length < 1 || digit_length > 10) {
    return { error: 'badRequest', message: 'Digit length must be between 1 and 10' };
  }
  if (body.max_no !== undefined && body.max_no !== null && body.max_no <= 0) {
    return { error: 'badRequest', message: 'Max number must be greater than 0' };
  }
  if (body.last_no !== undefined && body.last_no !== null && body.last_no < 0) {
    return { error: 'badRequest', message: 'Last number must be 0 or greater' };
  }

  const existing = await sequenceControlRepo.findByCodeAndLocation(sequence_code_id, location_id);
  if (existing) {
    return { error: 'conflict', message: 'A sequence control already exists for this sequence code and location' };
  }

  const control = await sequenceControlRepo.create(body, userId);
  return getById(control.id);
}

async function update(id, body, userId) {
  const current = await sequenceControlRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Sequence control not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  if (body.digit_length !== undefined) {
    if (body.digit_length < 1 || body.digit_length > 10) {
      return { error: 'badRequest', message: 'Digit length must be between 1 and 10' };
    }
  }
  if (body.max_no !== undefined && body.max_no !== null && body.max_no <= 0) {
    return { error: 'badRequest', message: 'Max number must be greater than 0' };
  }
  if (body.last_no !== undefined && body.last_no !== null && body.last_no < 0) {
    return { error: 'badRequest', message: 'Last number must be 0 or greater' };
  }

  const newSequenceCodeId = body.sequence_code_id !== undefined ? body.sequence_code_id : current.sequence_code_id;
  const newLocationId = body.location_id !== undefined ? body.location_id : current.location_id;

  const codeChanged = String(newSequenceCodeId) !== String(current.sequence_code_id);
  const locationChanged = String(newLocationId) !== String(current.location_id);

  if (codeChanged || locationChanged) {
    const duplicate = await sequenceControlRepo.findByCodeAndLocation(newSequenceCodeId, newLocationId, id);
    if (duplicate) {
      return { error: 'conflict', message: 'A sequence control already exists for this sequence code and location' };
    }
  }

  const updated = await sequenceControlRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(updated);
  if (stale) return stale;

  return getById(id);
}

async function remove(id, userId) {
  const current = await sequenceControlRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Sequence control not found' };
  await sequenceControlRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await sequenceControlRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
