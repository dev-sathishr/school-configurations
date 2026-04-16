const { verifyAccessToken } = require('../helpers/jwt.helper');
const { unauthorized, forbidden } = require('../helpers/response.helper');
const db = require('../../config/database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
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
