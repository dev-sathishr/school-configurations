const groupModuleService = require('./group-module.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await groupModuleService.getAll(req.query);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await groupModuleService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await groupModuleService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Group Module mapping created successfully');
}

async function update(req, resp) {
  const result = await groupModuleService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Group Module mapping updated successfully');
}

async function remove(req, resp) {
  const result = await groupModuleService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Group Module mapping deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await groupModuleService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} mapping(s) deleted successfully`);
}

async function importRows(req, resp) {
  const result = await groupModuleService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} mapping(s) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple, importRows });
