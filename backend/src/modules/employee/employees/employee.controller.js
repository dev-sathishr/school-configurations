const employeeService = require('./employee.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await employeeService.getAll(req.query, req.user.id);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await employeeService.getById(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getNextCode(req, resp) {
  const result = await employeeService.getNextCode(req.query.location_id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await employeeService.getDropdown(req.query, req.user.id);
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await employeeService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Employee created successfully');
}

async function update(req, resp) {
  const result = await employeeService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Employee updated successfully');
}

async function remove(req, resp) {
  const result = await employeeService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Employee deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await employeeService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} employee(s) deleted successfully`);
}

async function getLinkableDropdown(req, resp) {
  const result = await employeeService.getLinkableDropdown(req.query);
  return res.success(resp, result);
}

async function checkUnique(req, resp) {
  const { field, value, exclude_id } = req.query;
  const result = await employeeService.checkUnique(field, value, exclude_id || null);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

module.exports = wrap({ getAll, getById, getNextCode, getDropdown, getLinkableDropdown, create, update, remove, removeMultiple, checkUnique });
