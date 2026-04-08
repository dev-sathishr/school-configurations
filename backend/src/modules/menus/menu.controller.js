const menuService = require('./menu.service');
const res = require('../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await menuService.getAll(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get menus error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await menuService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { menu: result.menu });
  } catch (err) {
    console.error('Get menu error:', err);
    return res.error(resp);
  }
}

async function getDropdown(req, resp) {
  try {
    const result = await menuService.getDropdown(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get menus dropdown error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await menuService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { menu: result.menu }, 'Menu created successfully');
  } catch (err) {
    console.error('Create menu error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await menuService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { menu: result.menu }, 'Menu updated successfully');
  } catch (err) {
    console.error('Update menu error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await menuService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Menu deleted successfully');
  } catch (err) {
    console.error('Delete menu error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await menuService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} menu(s) deleted successfully`);
  } catch (err) {
    console.error('Delete multiple menus error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
