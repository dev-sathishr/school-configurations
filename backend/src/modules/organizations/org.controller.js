const orgService = require('./org.service');
const res = require('../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await orgService.getAll(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get organizations error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await orgService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data });
  } catch (err) {
    console.error('Get organization error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await orgService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { data: result.data }, 'Organization created successfully');
  } catch (err) {
    console.error('Create organization error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await orgService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data }, 'Organization updated successfully');
  } catch (err) {
    console.error('Update organization error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await orgService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Organization deleted successfully');
  } catch (err) {
    console.error('Delete organization error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await orgService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} organization(s) deleted`);
  } catch (err) {
    console.error('Delete multiple organizations error:', err);
    return res.error(resp);
  }
}

async function getDropdown(req, resp) {
  try {
    const result = await orgService.getDropdown(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get org dropdown error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, getDropdown };
