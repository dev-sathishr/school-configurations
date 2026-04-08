const moduleService = require('./module.service');
const res = require('../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await moduleService.getAll(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get modules error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await moduleService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data });
  } catch (err) {
    console.error('Get module error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await moduleService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { data: result.data }, 'Module created successfully');
  } catch (err) {
    console.error('Create module error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await moduleService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data }, 'Module updated successfully');
  } catch (err) {
    console.error('Update module error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await moduleService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Module deleted successfully');
  } catch (err) {
    console.error('Delete module error:', err);
    return res.error(resp);
  }
}

async function getDropdown(req, resp) {
  try {
    const result = await moduleService.getDropdown();
    return res.success(resp, result);
  } catch (err) {
    console.error('Get module dropdown error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, getDropdown };
