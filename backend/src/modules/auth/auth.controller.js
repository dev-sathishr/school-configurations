const authService = require('./auth.service');
const res = require('../../shared/helpers/response.helper');
const { wrap } = require('../../shared/middleware/async-handler');

function contextFromRequest(req) {
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.socket?.remoteAddress || '').trim();
  return {
    ip_address: ip || null,
    user_agent: req.headers['user-agent'] || null,
    latitude: req.body?.latitude ?? null,
    longitude: req.body?.longitude ?? null,
    location_label: req.body?.location_label || null,
  };
}

async function login(req, resp) {
  const { username, password } = req.body;
  const result = await authService.login(username, password, contextFromRequest(req));
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result.data, result.message);
}

async function refresh(req, resp) {
  const result = await authService.refresh(req.body.refresh_token);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result.data);
}

async function me(req, resp) {
  const result = await authService.me(req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result.data);
}

async function myPermissions(req, resp) {
  const result = await authService.getMyPermissions(req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result.data);
}

async function myLocations(req, resp) {
  const result = await authService.getMyLocations(req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result.data);
}

async function logout(req, resp) {
  await authService.logout(req.user?.session_id);
  return res.success(resp, {}, 'Logout successful');
}

module.exports = wrap({ login, refresh, me, myPermissions, myLocations, logout });
