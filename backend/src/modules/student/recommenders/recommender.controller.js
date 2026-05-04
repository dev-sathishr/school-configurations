const recommenderService = require('./recommender.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const result = await recommenderService.getAll(req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await recommenderService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await recommenderService.getDropdown(req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await recommenderService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Recommender created successfully');
}

async function update(req, resp) {
  const result = await recommenderService.update(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Recommender updated successfully');
}

async function remove(req, resp) {
  const result = await recommenderService.remove(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Recommender deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await recommenderService.removeMultiple(req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} recommender(s) deleted`);
}

module.exports = wrap({ getAll, getById, getDropdown, create, update, remove, removeMultiple });
