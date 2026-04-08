const menuModuleService = require('./menu-module.service');
const res = require('../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await menuModuleService.getAll(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get menu-modules error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await menuModuleService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { menu_module: result.menu_module });
  } catch (err) {
    console.error('Get menu-module error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await menuModuleService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { menu_module: result.menu_module }, 'Menu Module mapping created successfully');
  } catch (err) {
    console.error('Create menu-module error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await menuModuleService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { menu_module: result.menu_module }, 'Menu Module mapping updated successfully');
  } catch (err) {
    console.error('Update menu-module error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await menuModuleService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Menu Module mapping deleted successfully');
  } catch (err) {
    console.error('Delete menu-module error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await menuModuleService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} mapping(s) deleted successfully`);
  } catch (err) {
    console.error('Delete multiple menu-modules error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
