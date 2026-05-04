const mappingService = require('./recommendation-mapping.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await mappingService.getAll(req.params.profileId, req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await mappingService.getById(req.params.profileId, req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await mappingService.create(req.params.profileId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Recommendation added successfully');
}

async function update(req, resp) {
  const result = await mappingService.update(req.params.profileId, req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Recommendation updated successfully');
}

async function remove(req, resp) {
  const result = await mappingService.remove(req.params.profileId, req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Recommendation deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await mappingService.removeMultiple(req.params.profileId, req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} recommendation(s) deleted`);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple });
