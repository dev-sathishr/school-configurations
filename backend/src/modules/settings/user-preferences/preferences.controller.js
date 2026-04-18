const service = require('./preferences.service');
const res = require('../../../shared/helpers/response.helper');

async function get(req, resp) {
  try {
    const data = await service.getForUser(req.user.id);
    return res.success(resp, { preferences: data });
  } catch (err) {
    console.error('Get preferences error:', err);
    return res.error(resp);
  }
}

async function patch(req, resp) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.badRequest(resp, 'Body must be an object');
    }
    const data = await service.patchForUser(req.user.id, body);
    return res.success(resp, { preferences: data });
  } catch (err) {
    console.error('Patch preferences error:', err);
    return res.error(resp);
  }
}

async function track(req, resp) {
  try {
    const { type, id } = req.body || {};
    const result = await service.track(req.user.id, type, id);
    if (result.error === 'badRequest') return res.badRequest(resp, result.message);
    return res.success(resp, {});
  } catch (err) {
    console.error('Track preferences error:', err);
    return res.error(resp);
  }
}

module.exports = { get, patch, track };
