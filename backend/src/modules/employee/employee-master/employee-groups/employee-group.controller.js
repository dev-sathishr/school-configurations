const employeeGroupService = require('./employee-group.service');
const res = require('../../../../shared/helpers/response.helper');
const { wrap } = require('../../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await employeeGroupService.getAll(req.query, req.viewOwn ? req.user.id : null);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await employeeGroupService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await employeeGroupService.getDropdown(req.query);
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await employeeGroupService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Employee group created successfully');
}

async function update(req, resp) {
  const result = await employeeGroupService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Employee group updated successfully');
}

async function remove(req, resp) {
  const result = await employeeGroupService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Employee group deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await employeeGroupService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} employee group(s) deleted successfully`);
}

async function importRows(req, resp) {
  const result = await employeeGroupService.importRows(req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result, `${result.success_count} employee group(s) imported, ${result.error_count} failed`);
}

module.exports = wrap({ getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows });
