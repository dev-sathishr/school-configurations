const svc = require('./child-records.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getAll(req, resp) {
  const { parentSlug, parentId, fieldName } = req.params;
  const result = await svc.listChildren(parentSlug, parentId, fieldName);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const { parentSlug, parentId, fieldName } = req.params;
  const result = await svc.createChild(parentSlug, parentId, fieldName, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Row created');
}

async function update(req, resp) {
  const { parentSlug, parentId, fieldName, rowId } = req.params;
  const result = await svc.updateChild(parentSlug, parentId, fieldName, rowId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Row updated');
}

async function remove(req, resp) {
  const { parentSlug, parentId, fieldName, rowId } = req.params;
  const result = await svc.deleteChild(parentSlug, parentId, fieldName, rowId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Row deleted');
}

async function replace(req, resp) {
  const { parentSlug, parentId, fieldName } = req.params;
  const result = await svc.replaceChildren(parentSlug, parentId, fieldName, req.body.rows, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Rows saved');
}

module.exports = wrap({ getAll, create, update, remove, replace });
