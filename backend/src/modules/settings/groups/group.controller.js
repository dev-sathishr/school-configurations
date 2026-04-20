const groupService = require('./group.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await groupService.getAll(req.query, req.viewOwn ? req.user.id : null);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await groupService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await groupService.getDropdown(req.query);
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await groupService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Group created successfully');
}

async function update(req, resp) {
  const result = await groupService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Group updated successfully');
}

async function remove(req, resp) {
  const result = await groupService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Group deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await groupService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} group(s) deleted successfully`);
}

async function importRows(req, resp) {
  const result = await groupService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} group(s) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows });
