const levelService = require('./class-level.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await levelService.getAll(req.query, req.user.id);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await levelService.getById(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await levelService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Section created successfully');
}

async function update(req, resp) {
  const result = await levelService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Section updated successfully');
}

async function remove(req, resp) {
  const result = await levelService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Section deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await levelService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} section(s) deleted`);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple });
