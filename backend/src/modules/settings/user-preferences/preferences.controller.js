const service = require('./preferences.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function get(req, resp) {
  const data = await service.getForUser(req.user.id);
  return res.success(resp, { data });
}

async function patch(req, resp) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.badRequest(resp, 'Body must be an object');
  }
  const data = await service.patchForUser(req.user.id, body);
  return res.success(resp, { data });
}

async function track(req, resp) {
  const { type, id } = req.body || {};
  const result = await service.track(req.user.id, type, id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {});
}

module.exports = wrap({ get, patch, track });
