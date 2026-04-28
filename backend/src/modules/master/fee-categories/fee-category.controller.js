const feeCategoryService = require('./fee-category.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await feeCategoryService.getAll(req.query);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await feeCategoryService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await feeCategoryService.getDropdown(req.query);
  return res.success(resp, result);
}

async function create(req, resp) {
  const result = await feeCategoryService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Fee category created successfully');
}

async function update(req, resp) {
  const result = await feeCategoryService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Fee category updated successfully');
}

async function remove(req, resp) {
  const result = await feeCategoryService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Fee category deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await feeCategoryService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} fee category(ies) deleted successfully`);
}

module.exports = wrap({ getAll, getById, getDropdown, create, update, remove, removeMultiple });
