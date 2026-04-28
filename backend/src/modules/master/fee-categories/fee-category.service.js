const feeCategoryRepo = require('./fee-category.repository');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

async function getAll(query) {
  return feeCategoryRepo.findAll(query);
}

async function getById(id) {
  const record = await feeCategoryRepo.findById(id);
  if (!record) return { error: 'notFound', message: 'Fee category not found' };
  return { data: record };
}

async function getDropdown(query) {
  return feeCategoryRepo.getDropdown(query);
}

async function create(body, userId) {
  const { code, name } = body;
  if (!name || !name.trim()) return { error: 'badRequest', message: 'Name is required' };
  if (!code || !code.trim()) return { error: 'badRequest', message: 'Code is required' };

  const existing = await feeCategoryRepo.findByCode(code);
  if (existing) return { error: 'conflict', message: `Code "${code}" already exists` };

  const created = await feeCategoryRepo.create(body, userId);
  return getById(created.id);
}

async function update(id, body, userId) {
  const current = await feeCategoryRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Fee category not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await feeCategoryRepo.findByCode(body.code);
    if (duplicate) return { error: 'conflict', message: `Code "${body.code}" already exists` };
  }

  const updated = await feeCategoryRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(updated);
  if (stale) return stale;

  return getById(id);
}

async function remove(id, userId) {
  const current = await feeCategoryRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Fee category not found' };
  await feeCategoryRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await feeCategoryRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
