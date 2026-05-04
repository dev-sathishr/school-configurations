const registrationService = require('./registration.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getNextCode(req, resp) {
  const result = await registrationService.getNextCode(req.params.profileId, req.query.location_id || null);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getAll(req, resp) {
  const result = await registrationService.getAll(req.params.profileId, req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await registrationService.getById(req.params.profileId, req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await registrationService.create(req.params.profileId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Registration created successfully');
}

async function update(req, resp) {
  const result = await registrationService.update(req.params.profileId, req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Registration updated successfully');
}

async function remove(req, resp) {
  const result = await registrationService.remove(req.params.profileId, req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Registration deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await registrationService.removeMultiple(req.params.profileId, req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} registration(s) deleted`);
}

module.exports = wrap({ getAll, getById, getNextCode, create, update, remove, removeMultiple });
