const levelService = require('./class-level.service');
const res = require('../../../shared/helpers/response.helper');

function handleError(resp, result) {
  if (result.error === 'notFound') return res.notFound(resp, result.message);
  if (result.error === 'badRequest') return res.badRequest(resp, result.message);
  if (result.error === 'conflict') return res.conflict(resp, result.message);
  if (result.error === 'forbidden') return res.forbidden(resp, result.message);
  return null;
}

async function getAll(req, resp) {
  try {
    const result = await levelService.getAll(req.query, req.user.id);
    return res.success(resp, result);
  } catch (err) {
    console.error('Get class levels error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await levelService.getById(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data });
  } catch (err) {
    console.error('Get class level error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const result = await levelService.create(req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.created(resp, { data: result.data }, 'Section created successfully');
  } catch (err) {
    console.error('Create class level error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const result = await levelService.update(req.params.id, req.body, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { data: result.data }, 'Section updated successfully');
  } catch (err) {
    console.error('Update class level error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const result = await levelService.remove(req.params.id, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, {}, 'Section deleted successfully');
  } catch (err) {
    console.error('Delete class level error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const result = await levelService.removeMultiple(req.body.ids, req.user.id);
    if (result.error) return handleError(resp, result);
    return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} section(s) deleted`);
  } catch (err) {
    console.error('Delete multiple class levels error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
