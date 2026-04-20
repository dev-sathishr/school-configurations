const orgService = require('./org.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await orgService.getAll(req.query, req.viewOwn ? req.user.id : null);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await orgService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await orgService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Organization created successfully');
}

async function update(req, resp) {
  const result = await orgService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Organization updated successfully');
}

async function remove(req, resp) {
  const result = await orgService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Organization deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await orgService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} organization(s) deleted`);
}

async function getDropdown(req, resp) {
  const result = await orgService.getDropdown(req.query);
  return res.success(resp, result);
}

async function importRows(req, resp) {
  const result = await orgService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} organization(s) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple, getDropdown, importRows });
