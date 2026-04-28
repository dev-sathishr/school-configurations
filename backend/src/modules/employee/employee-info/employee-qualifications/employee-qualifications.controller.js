const svc = require('./employee-qualifications.service');
const res = require('../../../../shared/helpers/response.helper');
const { wrap } = require('../../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await svc.getAll(req.params.employeeId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getById(req, resp) {
  const result = await svc.getById(req.params.qualificationId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await svc.create(req.params.employeeId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Qualification saved');
}

async function update(req, resp) {
  const result = await svc.update(req.params.qualificationId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Qualification updated');
}

async function remove(req, resp) {
  const result = await svc.remove(req.params.qualificationId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Deleted successfully');
}

module.exports = wrap({ getAll, getById, create, update, remove });
