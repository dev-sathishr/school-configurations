const sequenceCodeService = require('./sequence-code.service');
const res = require('../../../../shared/helpers/response.helper');
const { wrap } = require('../../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await sequenceCodeService.getAll(req.query);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await sequenceCodeService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await sequenceCodeService.getDropdown(req.query);
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await sequenceCodeService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Sequence code created successfully');
}

async function update(req, resp) {
  const result = await sequenceCodeService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Sequence code updated successfully');
}

async function remove(req, resp) {
  const result = await sequenceCodeService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Sequence code deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await sequenceCodeService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} sequence code(s) deleted successfully`);
}

module.exports = wrap({ getAll, getById, getDropdown, create, update, remove, removeMultiple });
