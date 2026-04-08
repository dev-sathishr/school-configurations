const menuModuleRepo = require('./menu-module.repository');

async function getAll(query) {
  return menuModuleRepo.findAll(query);
}

async function getById(id) {
  const menuModule = await menuModuleRepo.findById(id);
  if (!menuModule) return { error: 'notFound', message: 'Menu Module mapping not found' };
  return { menu_module: menuModule };
}

async function create(body, userId) {
  const { menu_id, module_id } = body;
  if (!menu_id || !module_id) return { error: 'badRequest', message: 'Menu and Module are required' };

  const existing = await menuModuleRepo.findByMenuAndModule(menu_id, module_id);
  if (existing) return { error: 'conflict', message: 'This menu is already linked to this module' };

  const menuModule = await menuModuleRepo.create(body, userId);
  return { menu_module: menuModule };
}

async function update(id, body, userId) {
  const current = await menuModuleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu Module mapping not found' };

  const menuId = body.menu_id || current.menu_id;
  const moduleId = body.module_id || current.module_id;
  if (menuId !== current.menu_id || moduleId !== current.module_id) {
    const duplicate = await menuModuleRepo.findByMenuAndModule(menuId, moduleId);
    if (duplicate && duplicate.id !== id) return { error: 'conflict', message: 'This menu is already linked to this module' };
  }

  const menuModule = await menuModuleRepo.update(id, body, current, userId);
  return { menu_module: menuModule };
}

async function remove(id, userId) {
  const current = await menuModuleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu Module mapping not found' };
  await menuModuleRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await menuModuleRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
