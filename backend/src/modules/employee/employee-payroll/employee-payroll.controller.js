const payrollService = require('./employee-payroll.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await payrollService.getAllByEmployee(req.params.employeeId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getById(req, resp) {
  const result = await payrollService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await payrollService.create(req.params.employeeId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Payroll record created successfully');
}

async function update(req, resp) {
  const result = await payrollService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Payroll record updated successfully');
}

async function remove(req, resp) {
  const result = await payrollService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Payroll record deleted successfully');
}

async function addRejoin(req, resp) {
  const result = await payrollService.addRejoinPeriod(req.params.employeeId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Rejoin period added successfully');
}

module.exports = wrap({ getAll, getById, create, update, remove, addRejoin });
