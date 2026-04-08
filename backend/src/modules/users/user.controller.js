const userService = require('./user.service');
const res = require('../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await userService.getAll(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get users error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await userService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { user: result.user });
  } catch (err) {
    console.error('Get user error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await userService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { user: result.user }, 'User created successfully');
  } catch (err) {
    console.error('Create user error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await userService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { user: result.user }, 'User updated successfully');
  } catch (err) {
    console.error('Update user error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await userService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'User deleted successfully');
  } catch (err) {
    console.error('Delete user error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await userService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} user(s) deleted successfully`);
  } catch (err) {
    console.error('Delete multiple users error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
