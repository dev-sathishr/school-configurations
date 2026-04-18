const permissionService = require('./permission.service');
const res = require('../../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await permissionService.getAll(req.query, req.viewOwn ? req.user.id : null);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get permissions error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await permissionService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { permission: result.permission });
  } catch (err) {
    console.error('Get permission error:', err);
    return res.error(resp);
  }
}

async function getDropdown(req, resp) {
  try {
    const result = await permissionService.getDropdown(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get permissions dropdown error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await permissionService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { permission: result.permission }, 'Permission created successfully');
  } catch (err) {
    console.error('Create permission error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await permissionService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { permission: result.permission }, 'Permission updated successfully');
  } catch (err) {
    console.error('Update permission error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await permissionService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Permission deleted successfully');
  } catch (err) {
    console.error('Delete permission error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await permissionService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} permission(s) deleted successfully`);
  } catch (err) {
    console.error('Delete multiple permissions error:', err);
    return res.error(resp);
  }
}

async function importRows(req, resp) {
  try {
    const result = await permissionService.importRows(req.body.rows, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, result, `${result.success_count} permission(s) imported, ${result.error_count} failed`);
  } catch (err) {
    console.error('Import permissions error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows };
