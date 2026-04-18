const classService = require('./class.service');
const res = require('../../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await classService.getAll(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get classes error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await classService.getById(req.params.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data });
  } catch (err) {
    console.error('Get class error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await classService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { data: result.data }, 'Class created successfully');
  } catch (err) {
    console.error('Create class error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await classService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data }, 'Class updated successfully');
  } catch (err) {
    console.error('Update class error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await classService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Class deleted successfully');
  } catch (err) {
    console.error('Delete class error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await classService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} class(es) deleted`);
  } catch (err) {
    console.error('Delete multiple classes error:', err);
    return res.error(resp);
  }
}

async function getDropdown(req, resp) {
  try {
    const result = await classService.getDropdown(req.query);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get class dropdown error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, getDropdown };
