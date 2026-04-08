const db = require('../../config/database');
const { forbidden } = require('../helpers/response.helper');

/**
 * Module-based authorization middleware.
 * Checks if the user's group has the required permission on the given module.
 *
 * @param {string} moduleCode - e.g. 'settings.organization'
 * @param {string} action - 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
 */
function authorizeModule(moduleCode, action = 'can_view') {
  return async (req, res, next) => {
    try {
      const groupId = req.user.group_id;
      if (!groupId) return forbidden(res, 'No user group assigned');

      // Check if user's group is a system group (Super Admin bypass)
      const groupCheck = await db.query(
        'SELECT is_system FROM settings.user_groups WHERE id = $1 AND deleted_at IS NULL',
        [groupId]
      );
      if (groupCheck.rows[0]?.is_system) return next();

      // Check module permission
      const perm = await db.query(
        `SELECT gp.${action} AS allowed
         FROM settings.group_permissions gp
         JOIN settings.modules m ON m.id = gp.module_id
         WHERE gp.user_group_id = $1 AND m.code = $2 AND m.deleted_at IS NULL`,
        [groupId, moduleCode]
      );

      if (perm.rows[0]?.allowed) return next();
      return forbidden(res, 'Insufficient permissions');
    } catch (err) {
      console.error('Permission check error:', err);
      return forbidden(res, 'Permission check failed');
    }
  };
}

module.exports = { authorizeModule };
