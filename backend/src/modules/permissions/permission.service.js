const permissionRepo = require('./permission.repository');

async function getAll(query) {
  return permissionRepo.findAll(query);
}

async function getById(id) {
  const permission = await permissionRepo.findById(id);
  if (!permission) return { error: 'notFound', message: 'Permission not found' };
  return { permission };
}

async function create(body, userId) {
  const { group_id, module_id } = body;
  if (!group_id || !module_id) return { error: 'badRequest', message: 'Group and Module are required' };

  const existing = await permissionRepo.findByGroupAndModule(group_id, module_id);
  if (existing) return { error: 'conflict', message: 'Permission already exists for this group and menu' };

  const permission = await permissionRepo.create(body, userId);
  return { permission };
}

async function update(id, body, userId) {
  const current = await permissionRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Permission not found' };

  const groupId = body.group_id || current.group_id;
  const menuId = body.module_id || current.module_id;
  if (groupId !== current.group_id || menuId !== current.module_id) {
    const duplicate = await permissionRepo.findByGroupAndModule(groupId, moduleId);
    if (duplicate && duplicate.id !== id) return { error: 'conflict', message: 'Permission already exists for this group and menu' };
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

module.exports = { getAll, getById, create, update, remove, removeMultiple };
