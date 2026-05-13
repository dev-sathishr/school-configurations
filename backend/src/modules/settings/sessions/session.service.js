const sessionRepo = require('./session.repository');

async function getAll(query, scopeUserId) {
  return sessionRepo.findAll(query, scopeUserId);
}

async function getById(id, scopeUserId) {
  const session = await sessionRepo.findById(id);
  if (!session) return { error: 'notFound', message: 'Session not found' };
  if (scopeUserId && session.user_id !== scopeUserId) {
    return { error: 'forbidden', message: 'You can only view your own sessions' };
  }

  const activity = await sessionRepo.getActivity(id);
  return { data: { ...session, activity } };
}

async function revoke(id, revokedBy) {
  const session = await sessionRepo.findById(id);
  if (!session) return { error: 'notFound', message: 'Session not found' };
  if (session.revoked_at || session.logout_at) {
    return { error: 'badRequest', message: 'Session is not active' };
  }
  await sessionRepo.revoke(id, revokedBy);
  return { data: { id } };
}

/** Self-service revoke: user can revoke any of their own sessions except the current one. */
async function revokeOwn(id, userId, currentSessionId) {
  const session = await sessionRepo.findById(id);
  if (!session) return { error: 'notFound', message: 'Session not found' };
  if (session.user_id !== userId) return { error: 'forbidden', message: 'You can only revoke your own sessions' };
  if (session.id === currentSessionId) return { error: 'badRequest', message: 'Use logout to end your current session' };
  if (session.revoked_at || session.logout_at) return { error: 'badRequest', message: 'Session is already inactive' };
  await sessionRepo.revoke(id, userId);
  return { data: { id } };
}

/** Sign out every other active session for this user. The current session
 *  is kept alive so the caller doesn't get kicked out mid-click. */
async function revokeOthers(userId, currentSessionId) {
  const count = await sessionRepo.revokeOthers(userId, currentSessionId);
  return { data: { revoked_count: count } };
}

// Called by the authenticated user on each route change. The `session_id`
// comes from the JWT via auth middleware — never trust a client-supplied one.
// Tokens issued before the sessions feature landed have no session_id; we
// silently no-op for those so the frontend pinger doesn't spam 400s until
// users re-login and get a freshly-claimed token.
async function logActivity(sessionId, body) {
  if (!sessionId) return { data: {} };
  const routePath = String(body?.route_path || '').slice(0, 200);
  if (!routePath) return { data: {} };
  const moduleCode = body?.module_code ? String(body.module_code).slice(0, 50) : null;
  await sessionRepo.appendActivity(sessionId, { module_code: moduleCode, route_path: routePath });
  return { data: {} };
}

const ACTION_TYPES = new Set(['CREATE', 'EDIT', 'DELETE', 'IMPORT', 'EXPORT']);

async function trackAction(sessionId, body) {
  if (!sessionId) return { data: {} };
  const actionType = String(body?.action_type || '').toUpperCase();
  if (!ACTION_TYPES.has(actionType)) return { data: {} };
  const routePath = String(body?.route_path || '').slice(0, 200);
  const moduleCode = body?.module_code ? String(body.module_code).slice(0, 50) : null;
  const rawRecordId = body?.record_id || null;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const recordId = rawRecordId && UUID_RE.test(String(rawRecordId)) ? String(rawRecordId) : null;
  const resource = body?.resource ? String(body.resource).slice(0, 100) : null;
  await sessionRepo.logAction(sessionId, { module_code: moduleCode, route_path: routePath, action_type: actionType, record_id: recordId, resource });
  return { data: {} };
}

async function getOnline(scopeUserId) {
  const users = await sessionRepo.findActive(scopeUserId);
  return { data: users };
}

async function getUserAnalytics(userId) {
  const data = await sessionRepo.getUserAnalytics(userId);
  return { data };
}

async function getAdminAnalytics() {
  const data = await sessionRepo.getAdminAnalytics();
  return { data };
}

async function exportSessions(query, scopeUserId) {
  const csv = await sessionRepo.exportSessions(query, scopeUserId);
  return csv;
}

async function getRetention() {
  const days = await sessionRepo.getRetentionDays();
  return { data: { days } };
}

async function setRetention(days) {
  const d = parseInt(days);
  if (!d || d < 7 || d > 3650) return { error: 'badRequest', message: 'Retention must be between 7 and 3650 days' };
  await sessionRepo.setRetentionDays(d);
  return { data: { days: d } };
}

async function purge() {
  const days = await sessionRepo.getRetentionDays();
  const count = await sessionRepo.purgeOldSessions(days);
  return { data: { purged_count: count, retention_days: days } };
}

module.exports = {
  getAll, getById, getOnline, getUserAnalytics, getAdminAnalytics,
  exportSessions, getRetention, setRetention, purge,
  revoke, revokeOwn, revokeOthers, logActivity, trackAction,
};
