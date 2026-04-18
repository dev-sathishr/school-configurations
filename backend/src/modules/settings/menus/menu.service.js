const menuRepo = require('./menu.repository');

async function getAll(query, viewOwnUserId) {
  return menuRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const menu = await menuRepo.findByIdWithModules(id);
  if (!menu) return { error: 'notFound', message: 'Menu not found' };
  return { menu };
}

async function getDropdown(query) {
  return menuRepo.getDropdown(query);
}

async function getMenusWithModules() {
  const data = await menuRepo.getMenusWithModules();
  return { data };
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await menuRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Menu code already exists' };

  const menu = await menuRepo.create(body, userId);
  return { menu };
}

async function update(id, body, userId) {
  const current = await menuRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu not found' };

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await menuRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Menu code already exists' };
  }

  const menu = await menuRepo.update(id, body, current, userId);
  return { menu };
}

async function remove(id, userId) {
  const current = await menuRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu not found' };
  await menuRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await menuRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, getMenusWithModules, create, update, remove, removeMultiple };
