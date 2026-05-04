const assessmentService = require('./assessment.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getNextCode(req, resp) {
  const result = await assessmentService.getNextCode(req.params.profileId, req.query.location_id || null);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getAll(req, resp) {
  const result = await assessmentService.getAll(req.params.profileId, req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await assessmentService.getById(req.params.profileId, req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await assessmentService.create(req.params.profileId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Assessment created successfully');
}

async function update(req, resp) {
  const result = await assessmentService.update(req.params.profileId, req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Assessment updated successfully');
}

async function remove(req, resp) {
  const result = await assessmentService.remove(req.params.profileId, req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Assessment deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await assessmentService.removeMultiple(req.params.profileId, req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} assessment(s) deleted`);
}

module.exports = wrap({ getAll, getById, getNextCode, create, update, remove, removeMultiple });
