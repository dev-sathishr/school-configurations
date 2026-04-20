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

module.exports = { getAll, getById, revoke, revokeOthers, logActivity };
