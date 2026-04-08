const moduleRepo = require('./module.repository');

async function getAll(query) {
  return moduleRepo.findAll(query);
}

async function getById(id) {
  const mod = await moduleRepo.findById(id);
  if (!mod) return { error: 'notFound', message: 'Module not found' };
  return { module: mod };
}

async function getDropdown(query) {
  return moduleRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await moduleRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Module code already exists' };

  const mod = await moduleRepo.create(body, userId);
  return { module: mod };
}

async function update(id, body, userId) {
  const current = await moduleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Module not found' };

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await moduleRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Module code already exists' };
  }

  const mod = await moduleRepo.update(id, body, current, userId);
  return { module: mod };
}

async function remove(id, userId) {
  const current = await moduleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Module not found' };
  await moduleRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await moduleRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
