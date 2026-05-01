const curriculumRepo = require('./curriculum.repository');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

async function getAll(query) {
  return curriculumRepo.findAll(query);
}

async function getById(id) {
  const record = await curriculumRepo.findById(id);
  if (!record) return { error: 'notFound', message: 'Curriculum not found' };
  return { data: record };
}

async function getDropdown(query) {
  return curriculumRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name } = body;
  if (!name || !name.trim()) return { error: 'badRequest', message: 'Name is required' };

  const existing = await curriculumRepo.findByName(name.trim());
  if (existing) return { error: 'conflict', message: `Curriculum "${name}" already exists` };

  const created = await curriculumRepo.create({ ...body, name: name.trim() }, userId);
  return getById(created.id);
}

async function update(id, body, userId) {
  const current = await curriculumRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Curriculum not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  if (body.name && body.name.trim().toLowerCase() !== (current.name || '').toLowerCase()) {
    const duplicate = await curriculumRepo.findByName(body.name.trim());
    if (duplicate) return { error: 'conflict', message: `Curriculum "${body.name}" already exists` };
  }

  const updated = await curriculumRepo.update(
    id,
    body.name ? { ...body, name: body.name.trim() } : body,
    current,
    userId,
    version.data
  );
  const stale = toConflictIfStale(updated);
  if (stale) return stale;

  return getById(id);
}

async function remove(id, userId) {
  const current = await curriculumRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Curriculum not found' };
  await curriculumRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await curriculumRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
