const userService = require('./user.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await userService.getAll(req.query, req.viewOwn ? req.user.id : null);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await userService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await userService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'User created successfully');
}

async function update(req, resp) {
  const result = await userService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'User updated successfully');
}

async function remove(req, resp) {
  const result = await userService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'User deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await userService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} user(s) deleted successfully`);
}

async function importRows(req, resp) {
  const result = await userService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} user(s) imported, ${result.error_count} failed`);
}

async function checkUnique(req, resp) {
  const { field, value, exclude_id } = req.query;
  const result = await userService.checkUnique(field, value, exclude_id || null);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await userService.getDropdown(req.query);
  return res.success(resp, { data: result.data });
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple, importRows, checkUnique, getDropdown });
