const permissionService = require('./permission.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await permissionService.getAll(req.query, req.viewOwn ? req.user.id : null);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await permissionService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await permissionService.getDropdown(req.query);
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await permissionService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Permission created successfully');
}

async function update(req, resp) {
  const result = await permissionService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Permission updated successfully');
}

async function remove(req, resp) {
  const result = await permissionService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Permission deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await permissionService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} permission(s) deleted successfully`);
}

async function importRows(req, resp) {
  const result = await permissionService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} permission(s) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows });
