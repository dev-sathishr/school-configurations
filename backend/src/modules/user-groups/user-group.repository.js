const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `ug.*, cb.full_name AS created_by_name, ub.full_name AS updated_by_name,
  (SELECT COUNT(*) FROM settings.users u WHERE u.user_group_id = ug.id AND u.deleted_at IS NULL) AS assigned_users_count`;
const JOINS = 'LEFT JOIN settings.users cb ON ug.created_by = cb.id LEFT JOIN settings.users ub ON ug.updated_by = ub.id';

async function findAll(query) {
  return paginate({
    table: 'settings.user_groups',
    alias: 'ug',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['ug.name', 'ug.code', 'ug.description'],
    filterableColumns: ['ug.name', 'ug.code', 'ug.is_active', 'ug.is_system'],
    sortableColumns: ['ug.name', 'ug.code', 'ug.is_active', 'ug.is_system', 'ug.created_at'],
    defaultSortBy: 'ug.created_at',
    defaultSortOrder: 'DESC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.user_groups ug
    ${JOINS}
    WHERE ug.id = $1 AND ug.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.user_groups (name, code, description, is_system, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    data.name, data.code, data.description || null,
    data.is_system || false, data.is_active !== undefined ? data.is_active : true,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  // Block name/code changes for system groups
  const name = current.is_system ? current.name : (data.name || current.name);
  const code = current.is_system ? current.code : (data.code || current.code);

  const result = await db.query(`
    UPDATE settings.user_groups SET
      name = $1, code = $2, description = $3, is_active = $4,
      updated_by = $5, updated_at = NOW()
    WHERE id = $6 RETURNING *
  `, [
    name, code,
    data.description !== undefined ? data.description : current.description,
    data.is_active !== undefined ? data.is_active : current.is_active,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.user_groups SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.user_groups SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

async function checkUnique(field, value, excludeId = null) {
  let query = `SELECT id FROM settings.user_groups WHERE LOWER(${field}) = LOWER($1) AND deleted_at IS NULL`;
  const params = [value.trim()];
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function findAllActive() {
  const result = await db.query(
    'SELECT id, name, code FROM settings.user_groups WHERE is_active = true AND deleted_at IS NULL ORDER BY name'
  );
  return result.rows;
}

async function hasAssignedUsers(id) {
  const result = await db.query(
    'SELECT COUNT(*) FROM settings.users WHERE user_group_id = $1 AND deleted_at IS NULL',
    [id]
  );
  return parseInt(result.rows[0].count) > 0;
}

async function hasAssignedUsersMultiple(ids) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const result = await db.query(
    `SELECT user_group_id FROM settings.users WHERE user_group_id IN (${placeholders}) AND deleted_at IS NULL LIMIT 1`,
    ids
  );
  return result.rows.length > 0;
}

async function isSystemGroup(id) {
  const result = await db.query(
    'SELECT is_system FROM settings.user_groups WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0]?.is_system || false;
}

async function hasSystemGroups(ids) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const result = await db.query(
    `SELECT id FROM settings.user_groups WHERE id IN (${placeholders}) AND is_system = true AND deleted_at IS NULL LIMIT 1`,
    ids
  );
  return result.rows.length > 0;
}

async function getPermissions(groupId) {
  const result = await db.query(`
    SELECT
      m.id AS menu_id, m.name AS menu_name, m.code AS menu_code,
      mod.id AS module_id, mod.name AS module_name, mod.code AS module_code,
      gp.can_view, gp.can_create, gp.can_edit, gp.can_delete
    FROM settings.group_permissions gp
    JOIN settings.modules mod ON gp.module_id = mod.id
    JOIN settings.menus m ON mod.menu_id = m.id
    WHERE gp.user_group_id = $1
    ORDER BY m.name, mod.name
  `, [groupId]);

  // Structure by menu -> modules
  const menuMap = new Map();
  for (const row of result.rows) {
    if (!menuMap.has(row.menu_id)) {
      menuMap.set(row.menu_id, {
        menu: { id: row.menu_id, name: row.menu_name, code: row.menu_code },
        modules: [],
      });
    }
    menuMap.get(row.menu_id).modules.push({
      id: row.module_id,
      name: row.module_name,
      code: row.module_code,
      can_view: row.can_view,
      can_create: row.can_create,
      can_edit: row.can_edit,
      can_delete: row.can_delete,
    });
  }

  return Array.from(menuMap.values());
}

async function setPermissions(groupId, permissions, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing permissions
    await client.query('DELETE FROM settings.group_permissions WHERE user_group_id = $1', [groupId]);

    // Insert new permissions
    for (const perm of permissions) {
      await client.query(`
        INSERT INTO settings.group_permissions (user_group_id, module_id, can_view, can_create, can_edit, can_delete, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        groupId, perm.module_id,
        perm.can_view || false, perm.can_create || false,
        perm.can_edit || false, perm.can_delete || false,
        userId,
      ]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findAll, findById, create, update, softDelete, softDeleteMultiple,
  checkUnique, findAllActive, hasAssignedUsers, hasAssignedUsersMultiple,
  isSystemGroup, hasSystemGroups, getPermissions, setPermissions,
};
