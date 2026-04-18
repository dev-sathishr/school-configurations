const moduleService = require('./module.service');
const res = require('../../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await moduleService.getAll(req.query, req.viewOwn ? req.user.id : null);
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
    return res.success(resp, { module: result.module });
  } catch (err) {
    console.error('Get module error:', err);
    return res.error(resp);
  }
}

async function getDropdown(req, resp) {
  try {
    const result = await moduleService.getDropdown(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get modules dropdown error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await moduleService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { module: result.module }, 'Module created successfully');
  } catch (err) {
    console.error('Create module error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await moduleService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { module: result.module }, 'Module updated successfully');
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

async function removeMultiple(req, resp) {
  try {
    const result = await moduleService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} module(s) deleted successfully`);
  } catch (err) {
    console.error('Delete multiple modules error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
