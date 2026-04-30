const profileService = require('./student-profile.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

// FormData sends everything as strings — parse JSON fields back to objects/arrays.
function parseMultipartBody(body) {
  const parsed = { ...body };
  for (const key of ['addresses', 'family']) {
    if (typeof parsed[key] === 'string') {
      try { parsed[key] = JSON.parse(parsed[key]); } catch { delete parsed[key]; }
    }
  }
  if (parsed.is_active !== undefined) parsed.is_active = parsed.is_active === 'true';
  if (parsed.same_as_parent !== undefined) parsed.same_as_parent = parsed.same_as_parent === 'true';
  if (parsed.same_as_parent_source_index !== undefined) {
    const n = Number.parseInt(String(parsed.same_as_parent_source_index), 10);
    parsed.same_as_parent_source_index = Number.isInteger(n) ? n : undefined;
  }
  return parsed;
}

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
  const body = parseMultipartBody(req.body);
  const result = await profileService.create(body, req.file || null, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Student profile created successfully');
}

async function update(req, resp) {
  const body = parseMultipartBody(req.body);
  const result = await profileService.update(req.params.id, body, req.file || null, req.user.id);
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
