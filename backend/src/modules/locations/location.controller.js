const locationService = require('./location.service');
const res = require('../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await locationService.getAll(req.query, req.viewOwn ? req.user.id : null);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get locations error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await locationService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data });
  } catch (err) {
    console.error('Get location error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await locationService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { data: result.data }, 'Location created successfully');
  } catch (err) {
    console.error('Create location error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await locationService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data }, 'Location updated successfully');
  } catch (err) {
    console.error('Update location error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await locationService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Location deleted successfully');
  } catch (err) {
    console.error('Delete location error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await locationService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} location(s) deleted`);
  } catch (err) {
    console.error('Delete multiple locations error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
