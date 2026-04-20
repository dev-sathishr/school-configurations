const sessionService = require('./session.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

// Admin-scoped list. When the caller lacks module-wide VIEW (req.viewOwn set
// by checkModuleView), the repo restricts to their own sessions.
async function getAll(req, resp) {
  const scopeUserId = req.viewOwn ? req.user.id : null;
  const result = await sessionService.getAll(req.query, scopeUserId);
  return res.success(resp, result);
}

async function getMine(req, resp) {
  const result = await sessionService.getAll(req.query, req.user.id);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const scopeUserId = req.viewOwn ? req.user.id : null;
  const result = await sessionService.getById(req.params.id, scopeUserId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function revoke(req, resp) {
  const result = await sessionService.revoke(req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Session revoked');
}

async function revokeOthers(req, resp) {
  const result = await sessionService.revokeOthers(req.user.id, req.user.session_id);
  return res.success(resp, { data: result.data }, `${result.data.revoked_count} session(s) signed out`);
}

async function logActivity(req, resp) {
  const result = await sessionService.logActivity(req.user.session_id, req.body);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {});
}

module.exports = wrap({ getAll, getMine, getById, revoke, revokeOthers, logActivity });
