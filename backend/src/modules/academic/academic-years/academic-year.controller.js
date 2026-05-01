const ayService  = require('./academic-year.service');
const ayRepo     = require('./academic-year.repository');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await ayService.getAll(req.query, req.user.id);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await ayService.getById(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await ayService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Academic year created successfully');
}

async function update(req, resp) {
  const result = await ayService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Academic year updated successfully');
}

async function remove(req, resp) {
  const result = await ayService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Academic year deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await ayService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} academic year(s) deleted`);
}

async function getDropdown(req, resp) {
  const result = await ayRepo.dropdown(req.query);
  return res.success(resp, result);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple, getDropdown });
