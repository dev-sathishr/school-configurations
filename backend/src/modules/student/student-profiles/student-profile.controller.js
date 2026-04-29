const profileService = require('./student-profile.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await profileService.getAll(req.query, req.user.id);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await profileService.getById(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await profileService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Student profile created successfully');
}

async function update(req, resp) {
  const result = await profileService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Student profile updated successfully');
}

async function remove(req, resp) {
  const result = await profileService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Student profile deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await profileService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} profile(s) deleted`);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple });
