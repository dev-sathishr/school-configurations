const moduleRepo = require('./module.repository');
const menuRepo = require('../menus/menu.repository');
const { validate } = require('../../shared/helpers/validate.helper');

const MODULE_RULES = {
  name: { required: true, min: 3, max: 200, label: 'Name' },
  code: { required: true, min: 2, max: 100, label: 'Code' },
  icon: { max: 100, label: 'Icon' },
  route: { max: 300, label: 'Route' },
};

async function getAll(query) {
  return moduleRepo.findAll(query);
}

async function getById(id) {
  const mod = await moduleRepo.findById(id);
  if (!mod) return { error: 'notFound', message: 'Module not found' };
  return { data: mod };
}

async function create(body, userId) {
  const errors = validate(body, MODULE_RULES);
  if (!body.menu_id) errors.push('Menu is required');
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Validate menu exists
  const menu = await menuRepo.findById(body.menu_id);
  if (!menu) return { error: 'badRequest', message: 'Selected menu does not exist' };

  if (body.name) {
    const exists = await moduleRepo.checkUnique('name', body.name);
    if (exists) return { error: 'conflict', message: 'Module name already exists' };
  }
  if (body.code) {
    const exists = await moduleRepo.checkUnique('code', body.code);
    if (exists) return { error: 'conflict', message: 'Module code already exists' };
  }

  const mod = await moduleRepo.create(body, userId);
  return { data: mod };
}

async function update(id, body, userId) {
  const current = await moduleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Module not found' };

  const merged = { ...current, ...body };
  const errors = validate(merged, MODULE_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Validate menu exists if changed
  if (body.menu_id && body.menu_id !== current.menu_id) {
    const menu = await menuRepo.findById(body.menu_id);
    if (!menu) return { error: 'badRequest', message: 'Selected menu does not exist' };
  }

  if (body.name && body.name.trim().toLowerCase() !== current.name?.toLowerCase()) {
    const exists = await moduleRepo.checkUnique('name', body.name, id);
    if (exists) return { error: 'conflict', message: 'Module name already exists' };
  }
  if (body.code && body.code.trim().toLowerCase() !== current.code?.toLowerCase()) {
    const exists = await moduleRepo.checkUnique('code', body.code, id);
    if (exists) return { error: 'conflict', message: 'Module code already exists' };
  }

  const mod = await moduleRepo.update(id, body, current, userId);
  return { data: mod };
}

async function remove(id, userId) {
  const current = await moduleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Module not found' };

  await moduleRepo.softDelete(id, userId);
  return {};
}

async function getDropdown() {
  const data = await moduleRepo.findAllActive();
  return { data };
}

module.exports = { getAll, getById, create, update, remove, getDropdown };
