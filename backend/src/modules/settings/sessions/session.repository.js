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

async function getActivity(sessionId, limit = 500) {
  const result = await db.query(
    `SELECT id, module_code, route_path, accessed_at, exit_at, action_type, record_id, resource,
       CASE
         WHEN action_type IS NOT NULL THEN NULL
         WHEN exit_at IS NOT NULL THEN EXTRACT(EPOCH FROM (exit_at - accessed_at))::int
         ELSE NULL
       END AS duration_seconds
     FROM settings.session_activity
     WHERE session_id = $1
     ORDER BY accessed_at ASC
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

/** Close all open (no exit_at) activity rows for a session. Called when a new
 *  route is entered (to stamp the previous page's exit) and when the session
 *  itself ends (logout / revoke). */
async function closeOpenActivities(sessionId) {
  await db.query(
    `UPDATE settings.session_activity SET exit_at = NOW()
     WHERE session_id = $1 AND exit_at IS NULL AND action_type IS NULL`,
    [sessionId]
  );
}

async function endSession(id) {
  await closeOpenActivities(id);
  await db.query(
    `UPDATE settings.sessions SET logout_at = NOW() WHERE id = $1 AND logout_at IS NULL`,
    [id]
  );
}

async function revoke(id, revokedBy) {
  await closeOpenActivities(id);
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
  // Always keep last_activity_at current regardless of dedup outcome.
  await db.query(
    `UPDATE settings.sessions SET last_activity_at = NOW() WHERE id = $1`,
    [sessionId]
  );

  // If this route is ALREADY the currently-open navigation row, the user is
  // still on the same page — no new row needed (component re-mount, etc.).
  const currentOpen = await db.query(
    `SELECT id FROM settings.session_activity
     WHERE session_id = $1 AND exit_at IS NULL AND action_type IS NULL AND route_path = $2
     LIMIT 1`,
    [sessionId, route_path]
  );
  if (currentOpen.rows.length) return null;

  // Different page → stamp exit on the previous open navigation row and open a new one.
  await db.query(
    `UPDATE settings.session_activity SET exit_at = NOW()
     WHERE session_id = $1 AND exit_at IS NULL AND action_type IS NULL`,
    [sessionId]
  );

  const result = await db.query(
    `INSERT INTO settings.session_activity (session_id, module_code, route_path)
     VALUES ($1, $2, $3) RETURNING *`,
    [sessionId, module_code || null, route_path]
  );
  return result.rows[0];
}

/** Insert a discrete action event (CREATE/EDIT/DELETE/IMPORT/EXPORT).
 *  Action rows are pre-closed (exit_at = accessed_at) so the navigation
 *  row lifecycle never touches them. */
async function logAction(sessionId, { module_code, route_path, action_type, record_id, resource }) {
  await db.query(
    `UPDATE settings.sessions SET last_activity_at = NOW() WHERE id = $1`,
    [sessionId]
  );
  await db.query(
    `INSERT INTO settings.session_activity
       (session_id, module_code, route_path, action_type, record_id, resource, exit_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [sessionId, module_code || null, route_path || '', action_type, record_id || null, resource || null]
  );
}

/** All sessions that are currently active, with the user's latest route. */
async function findActive(scopeUserId) {
  const params = [];
  const conditions = ['s.logout_at IS NULL', 's.revoked_at IS NULL'];
  if (scopeUserId) {
    params.push(scopeUserId);
    conditions.push(`s.user_id = $${params.length}`);
  }

  const result = await db.query(
    `SELECT
       s.id, s.user_id, s.login_at, s.last_activity_at,
       s.ip_address::text AS ip_address, s.user_agent,
       u.username, u.full_name, u.email,
       pf.id AS profile_file_id,
       a.module_code  AS current_module,
       a.route_path   AS current_route,
       a.accessed_at  AS current_page_since,
       EXTRACT(EPOCH FROM (NOW() - COALESCE(a.accessed_at, s.login_at)))::int AS seconds_on_page,
       EXTRACT(EPOCH FROM (NOW() - s.login_at))::int AS session_seconds
     FROM settings.sessions s
     LEFT JOIN settings.users u ON s.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT f.id FROM settings.files f
       WHERE f.entity_type = 'user' AND f.entity_id = s.user_id
         AND f.file_type = 'profile_image' AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC LIMIT 1
     ) pf ON true
     LEFT JOIN LATERAL (
       SELECT module_code, route_path, accessed_at
       FROM settings.session_activity
       WHERE session_id = s.id
       ORDER BY accessed_at DESC LIMIT 1
     ) a ON true
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.last_activity_at DESC NULLS LAST`,
    params
  );
  return result.rows.map(decorate);
}

async function getUserAnalytics(userId) {
  const [moduleRows, actionRows, hourRows, sessionRows, totalRows] = await Promise.all([
    db.query(`
      SELECT
        COALESCE(sa.module_code, 'Other') AS module_code,
        COALESCE(SUM(CASE WHEN sa.action_type IS NULL AND sa.exit_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (sa.exit_at - sa.accessed_at))::int ELSE 0 END), 0)::int AS total_seconds,
        COUNT(CASE WHEN sa.action_type IS NULL THEN 1 END)::int AS page_visits,
        COUNT(CASE WHEN sa.action_type IS NOT NULL THEN 1 END)::int AS actions,
        COUNT(DISTINCT s.id)::int AS session_count
      FROM settings.sessions s
      JOIN settings.session_activity sa ON sa.session_id = s.id
      WHERE s.user_id = $1
      GROUP BY COALESCE(sa.module_code, 'Other')
      ORDER BY total_seconds DESC`, [userId]),

    db.query(`
      SELECT sa.action_type, sa.resource, COUNT(*)::int AS count
      FROM settings.session_activity sa
      JOIN settings.sessions s ON s.id = sa.session_id
      WHERE s.user_id = $1 AND sa.action_type IS NOT NULL
      GROUP BY sa.action_type, sa.resource
      ORDER BY count DESC LIMIT 30`, [userId]),

    db.query(`
      SELECT EXTRACT(HOUR FROM sa.accessed_at)::int AS hour_of_day,
             COUNT(*)::int AS event_count
      FROM settings.session_activity sa
      JOIN settings.sessions s ON s.id = sa.session_id
      WHERE s.user_id = $1 AND sa.accessed_at > NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM sa.accessed_at)
      ORDER BY hour_of_day`, [userId]),

    db.query(`
      SELECT s.id, s.login_at, s.logout_at, s.ip_address::text, s.user_agent,
        EXTRACT(EPOCH FROM (COALESCE(s.logout_at, s.revoked_at, NOW()) - s.login_at))::int AS session_seconds,
        COUNT(CASE WHEN sa.action_type IS NULL THEN 1 END)::int AS page_count,
        COUNT(CASE WHEN sa.action_type IS NOT NULL THEN 1 END)::int AS action_count,
        CASE WHEN s.revoked_at IS NOT NULL THEN 'revoked'
             WHEN s.logout_at IS NOT NULL THEN 'ended' ELSE 'active' END AS status
      FROM settings.sessions s
      LEFT JOIN settings.session_activity sa ON sa.session_id = s.id
      WHERE s.user_id = $1
      GROUP BY s.id ORDER BY s.login_at DESC LIMIT 10`, [userId]),

    db.query(`
      SELECT
        COUNT(DISTINCT s.id)::int AS total_sessions,
        COALESCE(SUM(CASE WHEN sa.action_type IS NULL AND sa.exit_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (sa.exit_at - sa.accessed_at))::int ELSE 0 END), 0)::int AS total_seconds,
        COUNT(CASE WHEN sa.action_type IS NULL THEN 1 END)::int AS total_pages,
        COUNT(CASE WHEN sa.action_type IS NOT NULL THEN 1 END)::int AS total_actions
      FROM settings.sessions s
      LEFT JOIN settings.session_activity sa ON sa.session_id = s.id
      WHERE s.user_id = $1`, [userId]),
  ]);

  return {
    module_usage: moduleRows.rows,
    action_breakdown: actionRows.rows,
    hourly_activity: hourRows.rows,
    recent_sessions: sessionRows.rows.map(r => ({ ...r, ...parseUserAgent(r.user_agent) })),
    totals: totalRows.rows[0],
  };
}

async function getTopUsers() {
  const result = await db.query(`
    SELECT u.id, u.full_name, u.username, u.email,
      pf.id AS profile_file_id,
      COUNT(DISTINCT s.id)::int AS session_count,
      COUNT(CASE WHEN sa.action_type IS NOT NULL THEN 1 END)::int AS action_count,
      COUNT(CASE WHEN sa.action_type IS NULL THEN 1 END)::int AS page_count,
      COALESCE(SUM(CASE WHEN sa.action_type IS NULL AND sa.exit_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (sa.exit_at - sa.accessed_at))::int ELSE 0 END), 0)::int AS total_seconds
    FROM settings.sessions s
    JOIN settings.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    LEFT JOIN settings.session_activity sa ON sa.session_id = s.id
    LEFT JOIN LATERAL (
      SELECT f.id FROM settings.files f
      WHERE f.entity_type = 'user' AND f.entity_id = s.user_id
        AND f.file_type = 'profile_image' AND f.deleted_at IS NULL
      ORDER BY f.created_at DESC LIMIT 1
    ) pf ON true
    WHERE s.login_at > NOW() - INTERVAL '7 days'
    GROUP BY u.id, u.full_name, u.username, u.email, pf.id
    ORDER BY session_count DESC, action_count DESC
    LIMIT 10`);
  return result.rows;
}

async function getAdminAnalytics() {
  const [liveRows, dayRows, moduleRows, totalRows, topUsers] = await Promise.all([
    db.query(`
      SELECT COUNT(*)::int AS active_sessions,
             COUNT(DISTINCT user_id)::int AS active_users
      FROM settings.sessions
      WHERE logout_at IS NULL AND revoked_at IS NULL`),

    db.query(`
      SELECT d.day::text,
             COALESCE(s.session_count, 0)::int AS session_count,
             COALESCE(s.user_count, 0)::int AS user_count
      FROM generate_series(
        (NOW() - INTERVAL '29 days')::date, NOW()::date, '1 day'::interval
      ) AS d(day)
      LEFT JOIN (
        SELECT DATE(login_at) AS day,
               COUNT(*)::int AS session_count,
               COUNT(DISTINCT user_id)::int AS user_count
        FROM settings.sessions
        WHERE login_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(login_at)
      ) s ON s.day = d.day::date
      ORDER BY d.day`),

    db.query(`
      SELECT COALESCE(sa.module_code, 'Other') AS module_code,
             COALESCE(SUM(EXTRACT(EPOCH FROM (sa.exit_at - sa.accessed_at))::int), 0)::int AS total_seconds,
             COUNT(*)::int AS visit_count
      FROM settings.session_activity sa
      WHERE sa.action_type IS NULL AND sa.exit_at IS NOT NULL
        AND sa.accessed_at > NOW() - INTERVAL '30 days'
      GROUP BY COALESCE(sa.module_code, 'Other')
      ORDER BY total_seconds DESC LIMIT 10`),

    db.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN login_at > CURRENT_DATE THEN id END)::int AS sessions_today,
        COUNT(DISTINCT CASE WHEN login_at > NOW() - INTERVAL '7 days' THEN id END)::int AS sessions_this_week,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(logout_at, revoked_at, NOW()) - login_at))), 0)::int AS avg_session_seconds
      FROM settings.sessions
      WHERE login_at > NOW() - INTERVAL '30 days'`),

    getTopUsers(),
  ]);

  return {
    live: liveRows.rows[0],
    sessions_per_day: dayRows.rows,
    top_modules: moduleRows.rows,
    totals: totalRows.rows[0],
    top_users: topUsers,
  };
}

/** Build a CSV string of sessions (max 5000 rows, same filters as findAll). */
async function exportSessions(query, scopeUserId) {
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
    conditions.push(`(u.full_name ILIKE $${i} OR u.username ILIKE $${i} OR u.email ILIKE $${i})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT ${SELECT_FIELDS} FROM settings.sessions s ${JOINS} ${where} ORDER BY s.login_at DESC LIMIT 5000`,
    params
  );

  const cols = ['id', 'full_name', 'username', 'email', 'ip_address', 'status', 'login_method',
    'login_at', 'logout_at', 'last_activity_at', 'revoked_at', 'revoked_by_name',
    'location_label', 'user_agent'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = cols.join(',');
  const lines = result.rows.map((r) => {
    const d = decorate(r);
    return cols.map((c) => esc(d[c])).join(',');
  });
  return header + '\n' + lines.join('\n');
}

// ── Retention settings (stored in settings.app_settings) ─────────────────────

const RETENTION_KEY = 'session_retention_days';
const RETENTION_DEFAULT = 90;

async function getRetentionDays() {
  const result = await db.query(
    `SELECT value FROM settings.app_settings WHERE key = $1`, [RETENTION_KEY]
  );
  return result.rows.length ? parseInt(result.rows[0].value) : RETENTION_DEFAULT;
}

async function setRetentionDays(days) {
  await db.query(
    `INSERT INTO settings.app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [RETENTION_KEY, String(days)]
  );
}

async function purgeOldSessions(days) {
  const result = await db.query(
    `DELETE FROM settings.sessions
     WHERE login_at < NOW() - ($1 || ' days')::interval
       AND (logout_at IS NOT NULL OR revoked_at IS NOT NULL)`,
    [days]
  );
  return result.rowCount;
}

// ── Suspicious login detection ────────────────────────────────────────────────

/** Returns true if `ip` has NOT been seen for this user in the last 30 days
 *  (excluding the just-created session). */
async function isNewIpForUser(userId, ip, excludeSessionId) {
  if (!ip) return false;
  const result = await db.query(
    `SELECT 1 FROM settings.sessions
     WHERE user_id = $1 AND ip_address::text = $2
       AND login_at > NOW() - INTERVAL '30 days'
       AND id <> $3
     LIMIT 1`,
    [userId, ip, excludeSessionId]
  );
  return result.rows.length === 0;
}

module.exports = {
  findAll, findById, getActivity, findActive,
  getUserAnalytics, getAdminAnalytics, getTopUsers,
  exportSessions,
  getRetentionDays, setRetentionDays, purgeOldSessions,
  isNewIpForUser,
  create, endSession, revoke, revokeOthers, appendActivity, logAction,
};
