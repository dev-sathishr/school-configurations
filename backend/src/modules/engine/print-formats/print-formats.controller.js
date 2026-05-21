const svc = require('./print-formats.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function list(req, resp) {
  const result = await svc.listFormats(req.params.slug);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getOne(req, resp) {
  const result = await svc.getFormat(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await svc.createFormat({ ...req.body, doctype_slug: req.params.slug }, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Print format created');
}

async function update(req, resp) {
  const result = await svc.updateFormat(req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Print format updated');
}

async function remove(req, resp) {
  const result = await svc.deleteFormat(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Print format deleted');
}

async function render(req, resp) {
  const result = await svc.renderFormat(req.params.id, req.params.recordId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

module.exports = wrap({ list, getOne, create, update, remove, render });
