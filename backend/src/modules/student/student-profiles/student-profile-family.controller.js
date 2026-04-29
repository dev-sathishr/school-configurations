const svc = require('../../employee/employee-info/employee-family/relation.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

const ENTITY_TYPE = 'student_profile';

async function getAll(req, resp) {
  const result = await svc.getAll(ENTITY_TYPE, req.params.profileId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getById(req, resp) {
  const result = await svc.getById(req.params.relationId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await svc.create(ENTITY_TYPE, req.params.profileId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Relation saved');
}

async function update(req, resp) {
  const result = await svc.update(req.params.relationId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Relation updated');
}

async function remove(req, resp) {
  const result = await svc.remove(req.params.relationId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Relation deleted');
}

module.exports = wrap({ getAll, getById, create, update, remove });
