const menuModuleService = require('./menu-module.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await menuModuleService.getAll(req.query);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await menuModuleService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await menuModuleService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Menu Module mapping created successfully');
}

async function update(req, resp) {
  const result = await menuModuleService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Menu Module mapping updated successfully');
}

async function remove(req, resp) {
  const result = await menuModuleService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Menu Module mapping deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await menuModuleService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} mapping(s) deleted successfully`);
}

async function importRows(req, resp) {
  const result = await menuModuleService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} mapping(s) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple, importRows });
