const { verifyAccessToken } = require('../helpers/jwt.helper');
const { unauthorized, forbidden, conflict } = require('../helpers/response.helper');
const db = require('../../config/database');
const editLockService = require('../../modules/edit-locks/edit-lock.service');
const { scoreModuleDescriptorMatch } = require('../helpers/module-code.helper');

// In-memory throttle for `last_activity_at` updates. Writing on every single
// authenticated request would thrash the DB; bucketing to once per 30s per
// session gives useful "last seen" accuracy without the overhead.
const ACTIVITY_THROTTLE_MS = 30_000;
const lastActivityWritten = new Map(); // sessionId -> epoch ms

async function resolveModuleIds(moduleCode) {
  const modules = await db.query(`
    SELECT id, name, display_name, route_path, display_order
      FROM settings.modules
     WHERE deleted_at IS NULL
  `);

  const scored = modules.rows
    .map((row) => ({
      id: row.id,
      score: scoreModuleDescriptorMatch(row, moduleCode),
      display_order: Number(row.display_order ?? 0),
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.display_order - b.display_order));

  return scored.length > 0 ? [scored[0].id] : [];
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  let decoded;
  try {
    const token = authHeader.split(' ')[1];
    decoded = verifyAccessToken(token);
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }

  // Bind the request to a session row (for audit + force-logout). Older
  // tokens without a `session_id` claim are allowed through — any token
  // issued since the sessions feature landed carries one, and grandfathering
  // keeps existing sessions working across the rollout.
  if (decoded.session_id) {
    try {
      const result = await db.query(
        `SELECT id, logout_at, revoked_at FROM settings.sessions WHERE id = $1`,
        [decoded.session_id]
      );
      const session = result.rows[0];
      if (!session) return unauthorized(res, 'Session not found');
      if (session.logout_at) return unauthorized(res, 'Session has ended');
      if (session.revoked_at) return unauthorized(res, 'Session revoked by administrator');

      const now = Date.now();
      const lastWritten = lastActivityWritten.get(decoded.session_id) || 0;
      if (now - lastWritten > ACTIVITY_THROTTLE_MS) {
        lastActivityWritten.set(decoded.session_id, now);
        // Fire-and-forget — don't block the request on this update.
        db.query(`UPDATE settings.sessions SET last_activity_at = NOW() WHERE id = $1`, [decoded.session_id])
          .catch((err) => console.error('last_activity_at update failed:', err));
      }
    } catch (err) {
      console.error('session check failed:', err);
      return unauthorized(res, 'Session verification failed');
    }
  }

  req.user = decoded;
  next();
}

function authorize(...groupCodes) {
  return (req, res, next) => {
    if (!groupCodes.includes(req.user.group_code)) {
      return forbidden(res, 'Insufficient permissions');
    }
    next();
  };
}

function authorizeModule(moduleCode, permissionCode) {
  return async (req, res, next) => {
    try {
      const moduleIds = await resolveModuleIds(moduleCode);
      if (moduleIds.length === 0) {
        return forbidden(res, 'You do not have permission to perform this action');
      }

      const result = await db.query(`
        SELECT 1 FROM settings.users u
        JOIN settings.group_permissions gp ON gp.group_id = u.group_id AND gp.deleted_at IS NULL
        JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
        WHERE u.id = $1
          AND gp.module_id = ANY($2::uuid[])
          AND UPPER(p.code) = UPPER($3)
        LIMIT 1
      `, [req.user.id, moduleIds, permissionCode]);

      if (result.rows.length === 0) {
        return forbidden(res, 'You do not have permission to perform this action');
      }

      // For record updates, enforce record lock when that module has
      // `enforce_edit_lock = true`.
      if (String(permissionCode || '').toUpperCase() === 'EDIT' && req.params?.id) {
        const lockCheck = await editLockService.checkRecordLockConflict(req.user.id, moduleCode, req.params.id);
        if (lockCheck.conflict) {
          return conflict(res, lockCheck.message);
        }
      }

      next();
    } catch (err) {
      console.error('authorizeModule error:', err);
      return forbidden(res, 'Permission check failed');
    }
  };
}

function checkModuleView(moduleCode) {
  return async (req, res, next) => {
    try {
      const moduleIds = await resolveModuleIds(moduleCode);
      if (moduleIds.length === 0) {
        return forbidden(res, 'You do not have access to this module');
      }

      const result = await db.query(`
        SELECT p.code FROM settings.users u
        JOIN settings.group_permissions gp ON gp.group_id = u.group_id AND gp.deleted_at IS NULL
        JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
        WHERE u.id = $1
          AND gp.module_id = ANY($2::uuid[])
      `, [req.user.id, moduleIds]);

      if (result.rows.length === 0) {
        return forbidden(res, 'You do not have access to this module');
      }

      const permCodes = result.rows.map(r => r.code.toUpperCase());
      req.viewOwn = !permCodes.includes('VIEW');
      next();
    } catch (err) {
      console.error('checkModuleView error:', err);
      return forbidden(res, 'Permission check failed');
    }
  };
}

function checkRecordOwnership(table, moduleCode) {
  return async (req, res, next) => {
    const recordId = req.params.id;
    if (!recordId) return next();

    try {
      const moduleIds = await resolveModuleIds(moduleCode);
      if (moduleIds.length === 0) {
        return forbidden(res, 'You do not have access to this module');
      }

      // Check if user has VIEW permission on this module
      const permResult = await db.query(`
        SELECT p.code FROM settings.users u
        JOIN settings.group_permissions gp ON gp.group_id = u.group_id AND gp.deleted_at IS NULL
        JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
        WHERE u.id = $1
          AND gp.module_id = ANY($2::uuid[])
      `, [req.user.id, moduleIds]);

      const permCodes = permResult.rows.map(r => r.code.toUpperCase());

      // If user has VIEW, they can access any record
      if (permCodes.includes('VIEW')) return next();

      // If user has no permissions at all, deny
      if (permCodes.length === 0) {
        return forbidden(res, 'You do not have access to this module');
      }

      // User has some permissions but no VIEW — check record ownership
      const record = await db.query(
        `SELECT created_by FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
        [recordId]
      );

      if (record.rows.length === 0) return next(); // Let the controller handle 404
      if (record.rows[0].created_by !== req.user.id) {
        return forbidden(res, 'You can only access your own records');
      }

      next();
    } catch (err) {
      console.error('checkRecordOwnership error:', err);
      return forbidden(res, 'Permission check failed');
    }
  };
}

module.exports = { authenticate, authorize, authorizeModule, checkModuleView, checkRecordOwnership };
