const recordsService = require('./records.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await recordsService.listRecords(req.params.slug, req.query, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data, pagination: result.pagination });
}

async function getById(req, resp) {
  const result = await recordsService.getRecord(req.params.slug, req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await recordsService.createRecord(req.params.slug, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Created successfully');
}

async function update(req, resp) {
  const result = await recordsService.updateRecord(req.params.slug, req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Updated successfully');
}

async function remove(req, resp) {
  const result = await recordsService.deleteRecord(req.params.slug, req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Deleted successfully');
}

async function removeMultiple(req, resp) {
  const ids = req.body.ids;
  if (!Array.isArray(ids) || ids.length === 0)
    return res.handleError(resp, { error: 'badRequest', message: 'ids array is required' });
  const result = await recordsService.deleteMultiple(req.params.slug, ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Deleted successfully');
}

async function checkUnique(req, resp) {
  const { field, value, exclude_id } = req.query;
  if (!field || !value)
    return res.handleError(resp, { error: 'badRequest', message: 'field and value are required' });
  const result = await recordsService.checkUnique(req.params.slug, field, value, exclude_id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await recordsService.getDropdown(req.params.slug, req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple, checkUnique, getDropdown });
