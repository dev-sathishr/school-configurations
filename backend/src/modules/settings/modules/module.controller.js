const moduleService = require('./module.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await moduleService.getAll(req.query, req.viewOwn ? req.user.id : null);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await moduleService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await moduleService.getDropdown(req.query);
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await moduleService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Module created successfully');
}

async function update(req, resp) {
  const result = await moduleService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Module updated successfully');
}

async function remove(req, resp) {
  const result = await moduleService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Module deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await moduleService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} module(s) deleted successfully`);
}

async function importRows(req, resp) {
  const result = await moduleService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} module(s) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows });
