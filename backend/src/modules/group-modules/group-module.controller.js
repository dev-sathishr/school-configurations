const groupModuleService = require('./group-module.service');
const res = require('../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await groupModuleService.getAll(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get group-modules error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await groupModuleService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { group_module: result.group_module });
  } catch (err) {
    console.error('Get group-module error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await groupModuleService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { group_module: result.group_module }, 'Group Module mapping created successfully');
  } catch (err) {
    console.error('Create group-module error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await groupModuleService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { group_module: result.group_module }, 'Group Module mapping updated successfully');
  } catch (err) {
    console.error('Update group-module error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await groupModuleService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Group Module mapping deleted successfully');
  } catch (err) {
    console.error('Delete group-module error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await groupModuleService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} mapping(s) deleted successfully`);
  } catch (err) {
    console.error('Delete multiple group-modules error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
