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

// Self-service: a user can revoke any of their own sessions (not just "others").
// They cannot revoke their current session — that's what logout is for.
async function revokeOwn(req, resp) {
  const result = await sessionService.revokeOwn(req.params.id, req.user.id, req.user.session_id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Session revoked');
}

async function trackAction(req, resp) {
  const result = await sessionService.trackAction(req.user.session_id, req.body);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {});
}

async function getOnline(req, resp) {
  const scopeUserId = req.viewOwn ? req.user.id : null;
  const result = await sessionService.getOnline(scopeUserId);
  return res.success(resp, { data: result.data });
}

async function getMyAnalytics(req, resp) {
  const result = await sessionService.getUserAnalytics(req.user.id);
  return res.success(resp, { data: result.data });
}

async function getAdminAnalytics(req, resp) {
  const result = await sessionService.getAdminAnalytics();
  return res.success(resp, { data: result.data });
}

async function getUserAnalyticsById(req, resp) {
  const result = await sessionService.getUserAnalytics(req.params.userId);
  return res.success(resp, { data: result.data });
}

async function exportSessions(req, resp) {
  const scopeUserId = req.viewOwn ? req.user.id : null;
  const csv = await sessionService.exportSessions(req.query, scopeUserId);
  const date = new Date().toISOString().slice(0, 10);
  resp.setHeader('Content-Type', 'text/csv; charset=utf-8');
  resp.setHeader('Content-Disposition', `attachment; filename="sessions-${date}.csv"`);
  resp.send(csv);
}

async function getRetention(req, resp) {
  const result = await sessionService.getRetention();
  return res.success(resp, { data: result.data });
}

async function setRetention(req, resp) {
  const result = await sessionService.setRetention(req.body.days);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Retention settings saved');
}

async function purge(req, resp) {
  const result = await sessionService.purge();
  return res.success(resp, { data: result.data }, `${result.data.purged_count} session(s) purged`);
}

async function logActivity(req, resp) {
  const result = await sessionService.logActivity(req.user.session_id, req.body);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {});
}

module.exports = wrap({
  getAll, getMine, getById, getOnline,
  getMyAnalytics, getAdminAnalytics, getUserAnalyticsById,
  exportSessions, getRetention, setRetention, purge,
  revoke, revokeOthers, revokeOwn, logActivity, trackAction,
});
