const documentTypeService = require('./document-type.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await documentTypeService.getAll(req.query);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await documentTypeService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await documentTypeService.getDropdown(req.query);
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await documentTypeService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Document type created successfully');
}

async function update(req, resp) {
  const result = await documentTypeService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Document type updated successfully');
}

async function remove(req, resp) {
  const result = await documentTypeService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Document type deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await documentTypeService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} document type(s) deleted successfully`);
}

module.exports = wrap({ getAll, getById, getDropdown, create, update, remove, removeMultiple });
