const menuService = require('./menu.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await menuService.getAll(req.query, req.viewOwn ? req.user.id : null);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await menuService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await menuService.getDropdown(req.query);
  return res.success(resp, result);
}

async function getMenusWithModules(req, resp) {
  const result = await menuService.getMenusWithModules();
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await menuService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Menu created successfully');
}

async function update(req, resp) {
  const result = await menuService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Menu updated successfully');
}

async function remove(req, resp) {
  const result = await menuService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Menu deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await menuService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} menu(s) deleted successfully`);
}

async function importRows(req, resp) {
  const result = await menuService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} menu(s) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, getDropdown, getMenusWithModules, create, update, remove, removeMultiple, importRows });
