const sequenceCodeRepo = require('./sequence-code.repository');
const db = require('../../../config/database');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

async function getAll(query) {
  return sequenceCodeRepo.findAll(query);
}

async function getById(id) {
  const sequenceCode = await sequenceCodeRepo.findById(id);
  if (!sequenceCode) return { error: 'notFound', message: 'Sequence code not found' };
  return { data: sequenceCode };
}

async function getDropdown(query) {
  return sequenceCodeRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await sequenceCodeRepo.findByCode(code);
  if (existing) return { error: 'conflict', message: 'Sequence code already exists' };

  const sequenceCode = await sequenceCodeRepo.create(body, userId);
  return getById(sequenceCode.id);
}

async function update(id, body, userId) {
  const current = await sequenceCodeRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Sequence code not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await sequenceCodeRepo.findByCode(body.code);
    if (duplicate) return { error: 'conflict', message: 'Sequence code already exists' };
  }

  const updated = await sequenceCodeRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(updated);
  if (stale) return stale;

  return getById(id);
}

async function remove(id, userId) {
  const current = await sequenceCodeRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Sequence code not found' };

  const usageResult = await db.query(
    `SELECT COUNT(*)::int AS cnt FROM settings.sequence_controls WHERE sequence_code_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const usageCount = usageResult.rows[0]?.cnt || 0;
  if (usageCount > 0) {
    return {
      error: 'conflict',
      message: `Cannot delete "${current.name}" — it is used by ${usageCount} sequence control(s). Remove the sequence controls first.`,
    };
  }

  await sequenceCodeRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }

  const blocked = [];
  for (const id of ids) {
    const current = await sequenceCodeRepo.findById(id);
    if (current) {
      const usageResult = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM settings.sequence_controls WHERE sequence_code_id = $1 AND deleted_at IS NULL`,
        [id]
      );
      const usageCount = usageResult.rows[0]?.cnt || 0;
      if (usageCount > 0) {
        blocked.push(`"${current.name}" (${usageCount} control(s))`);
      }
    }
  }

  if (blocked.length) {
    return {
      error: 'conflict',
      message: `Cannot delete: ${blocked.join(', ')}. Remove their sequence controls first.`,
    };
  }

  const deletedCount = await sequenceCodeRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
