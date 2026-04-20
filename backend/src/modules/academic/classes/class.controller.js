const classService = require('./class.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await classService.getAll(req.query);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await classService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await classService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Class created successfully');
}

async function update(req, resp) {
  const result = await classService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Class updated successfully');
}

async function remove(req, resp) {
  const result = await classService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Class deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await classService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} class(es) deleted`);
}

async function getDropdown(req, resp) {
  const result = await classService.getDropdown(req.query);
  return res.success(resp, result);
}

async function importRows(req, resp) {
  const result = await classService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} class(es) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple, getDropdown, importRows });
