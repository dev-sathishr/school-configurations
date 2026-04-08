const menuRepo = require('./menu.repository');
const { validate } = require('../../shared/helpers/validate.helper');

const MENU_RULES = {
  name: { required: true, min: 3, max: 200, label: 'Name' },
  code: { required: true, min: 2, max: 100, label: 'Code' },
  icon: { max: 100, label: 'Icon' },
};

async function getAll(query) {
  return menuRepo.findAll(query);
}

async function getById(id) {
  const menu = await menuRepo.findById(id);
  if (!menu) return { error: 'notFound', message: 'Menu not found' };
  return { data: menu };
}

async function create(body, userId) {
  const errors = validate(body, MENU_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.name) {
    const exists = await menuRepo.checkUnique('name', body.name);
    if (exists) return { error: 'conflict', message: 'Menu name already exists' };
  }
  if (body.code) {
    const exists = await menuRepo.checkUnique('code', body.code);
    if (exists) return { error: 'conflict', message: 'Menu code already exists' };
  }

  const menu = await menuRepo.create(body, userId);
  return { data: menu };
}

async function update(id, body, userId) {
  const current = await menuRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu not found' };

  const merged = { ...current, ...body };
  const errors = validate(merged, MENU_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.name && body.name.trim().toLowerCase() !== current.name?.toLowerCase()) {
    const exists = await menuRepo.checkUnique('name', body.name, id);
    if (exists) return { error: 'conflict', message: 'Menu name already exists' };
  }
  if (body.code && body.code.trim().toLowerCase() !== current.code?.toLowerCase()) {
    const exists = await menuRepo.checkUnique('code', body.code, id);
    if (exists) return { error: 'conflict', message: 'Menu code already exists' };
  }

  const menu = await menuRepo.update(id, body, current, userId);
  return { data: menu };
}

async function remove(id, userId) {
  const current = await menuRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu not found' };

  // Check if any modules reference this menu
  const db = require('../../config/database');
  const result = await db.query(
    'SELECT COUNT(*) FROM settings.modules WHERE menu_id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (parseInt(result.rows[0].count) > 0) {
    return { error: 'conflict', message: 'Cannot delete menu that has modules assigned to it' };
  }

  await menuRepo.softDelete(id, userId);
  return {};
}

async function getDropdown() {
  const data = await menuRepo.findAllActive();
  return { data };
}

module.exports = { getAll, getById, create, update, remove, getDropdown };
