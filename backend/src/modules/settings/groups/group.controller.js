const groupService = require('./group.service');
const res = require('../../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await groupService.getAll(req.query, req.viewOwn ? req.user.id : null);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get groups error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await groupService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { group: result.group });
  } catch (err) {
    console.error('Get group error:', err);
    return res.error(resp);
  }
}

async function getDropdown(req, resp) {
  try {
    const result = await groupService.getDropdown(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get groups dropdown error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await groupService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { group: result.group }, 'Group created successfully');
  } catch (err) {
    console.error('Create group error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await groupService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { group: result.group }, 'Group updated successfully');
  } catch (err) {
    console.error('Update group error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await groupService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Group deleted successfully');
  } catch (err) {
    console.error('Delete group error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await groupService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} group(s) deleted successfully`);
  } catch (err) {
    console.error('Delete multiple groups error:', err);
    return res.error(resp);
  }
}

async function importRows(req, resp) {
  try {
    const result = await groupService.importRows(req.body.rows, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, result, `${result.success_count} group(s) imported, ${result.error_count} failed`);
  } catch (err) {
    console.error('Import groups error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows };
