const metaService = require('./meta.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await metaService.listDoctypes(req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result.data);
}

async function getBySlug(req, resp) {
  const result = await metaService.getDoctypeBySlug(req.params.slug);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await metaService.createDoctype(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'DocType created successfully');
}

async function update(req, resp) {
  const result = await metaService.updateDoctype(req.params.slug, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'DocType updated successfully');
}

async function remove(req, resp) {
  const result = await metaService.softDeleteDoctype(req.params.slug, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'DocType deleted successfully');
}

async function upsertFields(req, resp) {
  const result = await metaService.upsertFields(req.params.slug, req.body.fields ?? req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Fields saved successfully');
}

async function removeField(req, resp) {
  const result = await metaService.softDeleteField(req.params.slug, req.params.fieldId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Field deleted successfully');
}

async function getDropdown(req, resp) {
  const result = await metaService.getDropdown(req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

module.exports = wrap({ getAll, getBySlug, create, update, remove, upsertFields, removeField, getDropdown });
