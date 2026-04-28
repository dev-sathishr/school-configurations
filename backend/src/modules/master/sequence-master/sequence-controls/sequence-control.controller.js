const sequenceControlService = require('./sequence-control.service');
const res = require('../../../../shared/helpers/response.helper');
const { wrap } = require('../../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await sequenceControlService.getAll(req.query);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await sequenceControlService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await sequenceControlService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Sequence control created successfully');
}

async function update(req, resp) {
  const result = await sequenceControlService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Sequence control updated successfully');
}

async function remove(req, resp) {
  const result = await sequenceControlService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Sequence control deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await sequenceControlService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} sequence control(s) deleted successfully`);
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple });
