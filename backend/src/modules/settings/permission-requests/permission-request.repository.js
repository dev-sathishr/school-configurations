const db = require('../../../config/database');
const { scoreModuleDescriptorMatch } = require('../../../shared/helpers/module-code.helper');

async function create(userId, message) {
  const result = await db.query(
    `INSERT INTO settings.permission_requests (requested_by, message)
     VALUES ($1, $2) RETURNING *`,
    [userId, message || null]
  );
  return result.rows[0];
}

async function findPendingByUser(userId) {
  const result = await db.query(
    `SELECT id, status, message, created_at FROM settings.permission_requests
     WHERE requested_by = $1 AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updateStatus(id, status, resolvedBy) {
  const result = await db.query(
    `UPDATE settings.permission_requests SET status = $1, resolved_by = $2, resolved_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, resolvedBy, id]
  );
  return result.rows[0];
}

// Find users who have EDIT permission on the module that best matches GROUPS.
async function findApprovers() {
  const modules = await db.query(`
    SELECT id, name, display_name, route_path, display_order
      FROM settings.modules
     WHERE deleted_at IS NULL
  `);

  const candidates = modules.rows
    .map((row) => ({
      id: row.id,
      score: scoreModuleDescriptorMatch(row, 'GROUPS'),
      display_order: Number(row.display_order ?? 0),
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.display_order - b.display_order));

  const moduleId = candidates[0]?.id;
  if (!moduleId) return [];

  const result = await db.query(
    `SELECT DISTINCT u.id, u.full_name
       FROM settings.users u
       JOIN settings.group_permissions gp ON gp.group_id = u.group_id AND gp.deleted_at IS NULL
       JOIN settings.modules mod ON gp.module_id = mod.id AND mod.deleted_at IS NULL
       JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL AND UPPER(p.code) = 'EDIT'
      WHERE u.deleted_at IS NULL
        AND u.is_active = true
        AND gp.module_id = $1`,
    [moduleId]
  );
  return result.rows;
}

module.exports = { create, findPendingByUser, updateStatus, findApprovers };
