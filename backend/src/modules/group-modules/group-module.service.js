const groupModuleRepo = require('./group-module.repository');

async function getAll(query) {
  return groupModuleRepo.findAll(query);
}

async function getById(id) {
  const groupModule = await groupModuleRepo.findById(id);
  if (!groupModule) return { error: 'notFound', message: 'Group Module mapping not found' };
  return { group_module: groupModule };
}

async function create(body, userId) {
  const { group_id, menu_id } = body;
  if (!group_id || !menu_id) return { error: 'badRequest', message: 'Group and Module are required' };

  const existing = await groupModuleRepo.findByGroupAndModule(group_id, menu_id);
  if (existing) return { error: 'conflict', message: 'This group is already linked to this module' };

  const groupModule = await groupModuleRepo.create(body, userId);
  return { group_module: groupModule };
}

async function update(id, body, userId) {
  const current = await groupModuleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Group Module mapping not found' };

  const groupId = body.group_id || current.group_id;
  const moduleId = body.menu_id || current.menu_id;
  if (groupId !== current.group_id || moduleId !== current.menu_id) {
    const duplicate = await groupModuleRepo.findByGroupAndModule(groupId, moduleId);
    if (duplicate && duplicate.id !== id) return { error: 'conflict', message: 'This group is already linked to this module' };
  }

  const groupModule = await groupModuleRepo.update(id, body, current, userId);
  return { group_module: groupModule };
}

async function remove(id, userId) {
  const current = await groupModuleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Group Module mapping not found' };
  await groupModuleRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await groupModuleRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
