const db = require('../../../config/database');
const { parseUserAgent } = require('../../../shared/helpers/user-agent.helper');

const SELECT_FIELDS = `s.id, s.user_id, s.login_at, s.logout_at, s.last_activity_at,
  s.revoked_at, s.revoked_by, s.ip_address::text AS ip_address, s.user_agent,
  s.latitude, s.longitude, s.location_label, s.login_method,
  u.username, u.full_name, u.email,
  rb.full_name AS revoked_by_name,
  pf.id AS profile_file_id,
  CASE
    WHEN s.revoked_at IS NOT NULL THEN 'revoked'
    WHEN s.logout_at IS NOT NULL THEN 'ended'
    ELSE 'active'
  END AS status`;

// LATERAL subquery picks the user's current profile image. The file-upload
// path soft-deletes the previous row on replace, so "latest non-deleted"
// always matches what the user sees on their profile.
const JOINS = `LEFT JOIN settings.users u ON s.user_id = u.id
  LEFT JOIN settings.users rb ON s.revoked_by = rb.id
  LEFT JOIN LATERAL (
    SELECT f.id FROM settings.files f
    WHERE f.entity_type = 'user' AND f.entity_id = s.user_id
      AND f.file_type = 'profile_image' AND f.deleted_at IS NULL
    ORDER BY f.created_at DESC LIMIT 1
  ) pf ON true`;

/** Decorate a row with parsed user-agent fields for readable display. */
function decorate(row) {
  if (!row) return row;
  return { ...row, ...parseUserAgent(row.user_agent) };
}

// paginate() expects `?` placeholders; our clauses use `$n` directly so we
// bypass it here and run count + list with prebuilt conditions for exact
// control of `user_id` / `active` filters.
async function findAll(query, scopeUserId) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const size = Math.min(100, Math.max(1, parseInt(query.size) || 10));
  const offset = (page - 1) * size;

  const conditions = [];
  const params = [];

  if (scopeUserId) {
    params.push(scopeUserId);
    conditions.push(`s.user_id = $${params.length}`);
  }
  if (query.active === 'true') {
    conditions.push('s.logout_at IS NULL AND s.revoked_at IS NULL');
  }
  if (query.user_id) {
    params.push(query.user_id);
    conditions.push(`s.user_id = $${params.length}`);
  }
  if (query.search) {
    params.push(`%${query.search}%`);
    const i = params.length;
    conditions.push(`(u.full_name ILIKE $${i} OR u.username ILIKE $${i} OR u.email ILIKE $${i} OR CAST(s.ip_address AS TEXT) ILIKE $${i})`);
  }

  const sortable = new Set(['s.login_at', 's.last_activity_at', 's.logout_at', 'u.full_name']);
  const sortBy = sortable.has(query.sort_by) ? query.sort_by : 's.login_at';
  const sortOrder = query.sort_order === 'asc' ? 'ASC' : 'DESC';

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const count = await db.query(`SELECT COUNT(*) FROM settings.sessions s ${JOINS} ${where}`, params);
  const totalCount = parseInt(count.rows[0].count);

  params.push(size); const limitIdx = params.length;
  params.push(offset); const offsetIdx = params.length;

  const rows = await db.query(
    `SELECT ${SELECT_FIELDS}
     FROM settings.sessions s
     ${JOINS}
     ${where}
     ORDER BY ${sortBy} ${sortOrder}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return {
    data: rows.rows.map(decorate),
    pagination: { page, size, total_count: totalCount, total_pages: Math.ceil(totalCount / size) },
  };
}

async function findById(id) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS} FROM settings.sessions s ${JOINS} WHERE s.id = $1`,
    [id]
  );
  return decorate(result.rows[0] || null);
}

async function getActivity(sessionId, limit = 100) {
  const result = await db.query(
    `SELECT id, module_code, route_path, accessed_at
     FROM settings.session_activity
     WHERE session_id = $1
     ORDER BY accessed_at DESC
     LIMIT $2`,
    [sessionId, limit]
  );
  return result.rows;
}

async function create(data) {
  const result = await db.query(
    `INSERT INTO settings.sessions
       (user_id, ip_address, user_agent, latitude, longitude, location_label, login_method)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.user_id, data.ip_address, data.user_agent, data.latitude, data.longitude, data.location_label, data.login_method || 'password']
  );
  return result.rows[0];
}

async function endSession(id) {
  await db.query(
    `UPDATE settings.sessions SET logout_at = NOW() WHERE id = $1 AND logout_at IS NULL`,
    [id]
  );
}

async function revoke(id, revokedBy) {
  await db.query(
    `UPDATE settings.sessions SET revoked_at = NOW(), revoked_by = $2 WHERE id = $1 AND revoked_at IS NULL`,
    [id, revokedBy]
  );
}

/**
 * Revoke every active session for `userId` except the one currently in use.
 * Returns the count of revoked sessions so the UI can show "n devices signed
 * out". `currentSessionId` is allowed to be null when the caller isn't
 * session-bound — in that case every active session goes.
 */
async function revokeOthers(userId, currentSessionId) {
  const params = [userId];
  let sql = `UPDATE settings.sessions SET revoked_at = NOW(), revoked_by = $1
             WHERE user_id = $1 AND logout_at IS NULL AND revoked_at IS NULL`;
  if (currentSessionId) {
    params.push(currentSessionId);
    sql += ` AND id <> $${params.length}`;
  }
  sql += ' RETURNING id';
  const result = await db.query(sql, params);
  return result.rowCount;
}

async function appendActivity(sessionId, { module_code, route_path }) {
  // Dedupe: skip if the most recent activity for this session is the same
  // route within the last 60 seconds. Avoids flooding the log on rapid
  // route toggles or component re-mounts.
  const recent = await db.query(
    `SELECT 1 FROM settings.session_activity
     WHERE session_id = $1 AND route_path = $2 AND accessed_at > NOW() - INTERVAL '60 seconds'
     LIMIT 1`,
    [sessionId, route_path]
  );
  if (recent.rows.length) return null;

  const result = await db.query(
    `INSERT INTO settings.session_activity (session_id, module_code, route_path)
     VALUES ($1, $2, $3) RETURNING *`,
    [sessionId, module_code || null, route_path]
  );
  return result.rows[0];
}

module.exports = { findAll, findById, getActivity, create, endSession, revoke, revokeOthers, appendActivity };
