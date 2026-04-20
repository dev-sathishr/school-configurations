const { verifyAccessToken } = require('../helpers/jwt.helper');
const { unauthorized, forbidden } = require('../helpers/response.helper');
const db = require('../../config/database');

// In-memory throttle for `last_activity_at` updates. Writing on every single
// authenticated request would thrash the DB; bucketing to once per 30s per
// session gives useful "last seen" accuracy without the overhead.
const ACTIVITY_THROTTLE_MS = 30_000;
const lastActivityWritten = new Map(); // sessionId -> epoch ms

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
    // Super admin bypasses all checks
    if (req.user.group_code === 'SUPER_ADMIN') return next();

    try {
      const result = await db.query(`
        SELECT 1 FROM settings.users u
        JOIN settings.group_permissions gp ON gp.group_id = u.group_id AND gp.deleted_at IS NULL
        JOIN settings.modules mod ON gp.module_id = mod.id AND mod.deleted_at IS NULL
        JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
        WHERE u.id = $1 AND UPPER(mod.code) = UPPER($2) AND UPPER(p.code) = UPPER($3)
        LIMIT 1
      `, [req.user.id, moduleCode, permissionCode]);

      if (result.rows.length === 0) {
        return forbidden(res, 'You do not have permission to perform this action');
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
    // Super admin always sees all
    if (req.user.group_code === 'SUPER_ADMIN') {
      req.viewOwn = false;
      return next();
    }

    try {
      const result = await db.query(`
        SELECT p.code FROM settings.users u
        JOIN settings.group_permissions gp ON gp.group_id = u.group_id AND gp.deleted_at IS NULL
        JOIN settings.modules mod ON gp.module_id = mod.id AND mod.deleted_at IS NULL
        JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
        WHERE u.id = $1 AND UPPER(mod.code) = UPPER($2)
      `, [req.user.id, moduleCode]);

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
    if (req.user.group_code === 'SUPER_ADMIN') return next();

    const recordId = req.params.id;
    if (!recordId) return next();

    try {
      // Check if user has VIEW permission on this module
      const permResult = await db.query(`
        SELECT p.code FROM settings.users u
        JOIN settings.group_permissions gp ON gp.group_id = u.group_id AND gp.deleted_at IS NULL
        JOIN settings.modules mod ON gp.module_id = mod.id AND mod.deleted_at IS NULL
        JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
        WHERE u.id = $1 AND UPPER(mod.code) = UPPER($2)
      `, [req.user.id, moduleCode]);

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
