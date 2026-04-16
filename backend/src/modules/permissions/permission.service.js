const permissionRepo = require('./permission.repository');

async function getAll(query) {
  return permissionRepo.findAll(query);
}

async function getById(id) {
  const permission = await permissionRepo.findById(id);
  if (!permission) return { error: 'notFound', message: 'Permission not found' };
  return { permission };
}

async function getDropdown(query) {
  return permissionRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await permissionRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Permission code already exists' };

  const permission = await permissionRepo.create(body, userId);
  return { permission };
}

async function update(id, body, userId) {
  const current = await permissionRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Permission not found' };

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await permissionRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Permission code already exists' };
  }

  const permission = await permissionRepo.update(id, body, current, userId);
  return { permission };
}

async function remove(id, userId) {
  const current = await permissionRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Permission not found' };
  await permissionRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await permissionRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
