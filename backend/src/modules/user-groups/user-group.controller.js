const userGroupService = require('./user-group.service');
const res = require('../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await userGroupService.getAll(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get user groups error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await userGroupService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data });
  } catch (err) {
    console.error('Get user group error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await userGroupService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { data: result.data }, 'User group created successfully');
  } catch (err) {
    console.error('Create user group error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await userGroupService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data }, 'User group updated successfully');
  } catch (err) {
    console.error('Update user group error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await userGroupService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'User group deleted successfully');
  } catch (err) {
    console.error('Delete user group error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await userGroupService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} user group(s) deleted`);
  } catch (err) {
    console.error('Delete multiple user groups error:', err);
    return res.error(resp);
  }
}

async function getDropdown(req, resp) {
  try {
    const result = await userGroupService.getDropdown();
    return res.success(resp, result);
  } catch (err) {
    console.error('Get user group dropdown error:', err);
    return res.error(resp);
  }
}

async function getPermissions(req, resp) {
  try {
    const result = await userGroupService.getPermissions(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data });
  } catch (err) {
    console.error('Get group permissions error:', err);
    return res.error(resp);
  }
}

async function setPermissions(req, resp) {
  try {
    const result = await userGroupService.setPermissions(req.params.id, req.body.permissions, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data }, 'Permissions updated successfully');
  } catch (err) {
    console.error('Set group permissions error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, getDropdown, getPermissions, setPermissions };
