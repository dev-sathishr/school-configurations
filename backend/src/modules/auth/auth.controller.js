const authService = require('./auth.service');
const res = require('../../shared/helpers/response.helper');

async function login(req, resp) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    if (result.error === 'badRequest') return res.badRequest(resp, result.message);
    if (result.error === 'unauthorized') return res.unauthorized(resp, result.message);
    if (result.error === 'forbidden') return res.forbidden(resp, result.message);

    return res.success(resp, result.data, result.message);
  } catch (err) {
    console.error('Login error:', err);
    return res.error(resp);
  }
}

async function refresh(req, resp) {
  try {
    const result = await authService.refresh(req.body.refresh_token);

    if (result.error === 'badRequest') return res.badRequest(resp, result.message);
    if (result.error === 'unauthorized') return res.unauthorized(resp, result.message);

    return res.success(resp, result.data);
  } catch (err) {
    return res.unauthorized(resp, 'Invalid or expired refresh token');
  }
}

async function me(req, resp) {
  try {
    const result = await authService.me(req.user.id);

    if (result.error === 'notFound') return res.notFound(resp, result.message);

    return res.success(resp, result.data);
  } catch (err) {
    console.error('Me error:', err);
    return res.error(resp);
  }
}

async function myPermissions(req, resp) {
  try {
    const result = await authService.getMyPermissions(req.user.id);

    if (result.error === 'notFound') return res.notFound(resp, result.message);

    return res.success(resp, result.data);
  } catch (err) {
    console.error('My permissions error:', err);
    return res.error(resp);
  }
}

async function logout(req, resp) {
  return res.success(resp, {}, 'Logout successful');
}

module.exports = { login, refresh, me, myPermissions, logout };
