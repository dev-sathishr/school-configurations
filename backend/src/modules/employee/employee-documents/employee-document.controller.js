const svc = require('./employee-document.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await svc.getAll(req.params.employeeId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getById(req, resp) {
  const result = await svc.getById(req.params.documentId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await svc.create(req.params.employeeId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Document saved');
}

async function update(req, resp) {
  const result = await svc.update(req.params.documentId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Document updated');
}

async function remove(req, resp) {
  const result = await svc.remove(req.params.documentId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Document deleted');
}

module.exports = wrap({ getAll, getById, create, update, remove });
