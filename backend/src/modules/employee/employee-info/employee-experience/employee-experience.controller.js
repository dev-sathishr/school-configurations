const svc = require('./employee-experience.service');
const res = require('../../../../shared/helpers/response.helper');
const { wrap } = require('../../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await svc.getAll(req.params.employeeId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getById(req, resp) {
  const result = await svc.getById(req.params.experienceId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await svc.create(req.params.employeeId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Experience saved');
}

async function update(req, resp) {
  const result = await svc.update(req.params.experienceId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Experience updated');
}

async function remove(req, resp) {
  const result = await svc.remove(req.params.experienceId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Deleted successfully');
}

module.exports = wrap({ getAll, getById, create, update, remove });
