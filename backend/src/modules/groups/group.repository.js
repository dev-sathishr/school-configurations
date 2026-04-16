const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `g.id, g.name, g.code, g.description, g.is_active,
  g.created_by, g.updated_by, g.created_at, g.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = 'LEFT JOIN settings.users cb ON g.created_by = cb.id LEFT JOIN settings.users ub ON g.updated_by = ub.id';

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: 'settings.groups',
    alias: 'g',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['g.name', 'g.code', 'g.description'],
    filterableColumns: ['g.name', 'g.code', 'g.is_active'],
    sortableColumns: ['g.name', 'g.code', 'g.is_active', 'g.created_at'],
    defaultSortBy: 'g.created_at',
    defaultSortOrder: 'DESC',
    ...(viewOwnUserId ? { extraWhere: 'g.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.groups g
    ${JOINS}
    WHERE g.id = $1 AND g.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByIdWithPermissions(id) {
  const group = await findById(id);
  if (!group) return null;

  const menuAccess = await db.query(
    'SELECT gm.menu_id FROM settings.group_modules gm WHERE gm.group_id = $1 AND gm.deleted_at IS NULL',
    [id]
  );
  group.menu_ids = menuAccess.rows.map(r => r.menu_id);

  const perms = await db.query(
    `SELECT gp.module_id, gp.permission_id, p.code AS permission_code
     FROM settings.group_permissions gp
     JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
     WHERE gp.group_id = $1 AND gp.deleted_at IS NULL`,
    [id]
  );
  group.permissions = perms.rows;

  return group;
}

async function findByCodeActive(code) {
  const result = await db.query('SELECT * FROM settings.groups WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL', [code]);
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: 'settings.groups',
    alias: 'g',
    selectFields: 'g.id, g.name',
    searchColumns: ['g.name'],
    filterableColumns: [],
    sortableColumns: ['g.name'],
    defaultSortBy: 'g.name',
    defaultSortOrder: 'ASC',
    extraWhere: "g.is_active = true",
  }, query);
}

async function create(data, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO settings.groups (name, code, description, is_active, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, code, description, is_active, created_at
    `, [
      data.name, data.code, data.description || null,
      data.is_active !== undefined ? data.is_active : true,
      userId, userId,
    ]);
    const group = result.rows[0];

    if (data.menu_ids && Array.isArray(data.menu_ids)) {
      await syncMenuAccess(client, group.id, data.menu_ids, userId);
    }

    if (data.permissions && Array.isArray(data.permissions)) {
      await syncPermissions(client, group.id, data.permissions, userId);
    }

    await client.query('COMMIT');
    return await findByIdWithPermissions(group.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function update(id, data, current, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      UPDATE settings.groups SET
        name = $1, code = $2, description = $3, is_active = $4,
        updated_by = $5, updated_at = NOW()
      WHERE id = $6
    `, [
      data.name || current.name,
      data.code || current.code,
      data.description !== undefined ? (data.description || null) : current.description,
      data.is_active !== undefined ? data.is_active : current.is_active,
      userId, id,
    ]);

    if (data.menu_ids && Array.isArray(data.menu_ids)) {
      await syncMenuAccess(client, id, data.menu_ids, userId);
    }

    if (data.permissions && Array.isArray(data.permissions)) {
      await syncPermissions(client, id, data.permissions, userId);
    }

    await client.query('COMMIT');
    return await findByIdWithPermissions(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function syncMenuAccess(client, groupId, menuIds, userId) {
  await client.query(
    'UPDATE settings.group_modules SET deleted_at = NOW(), deleted_by = $1 WHERE group_id = $2 AND deleted_at IS NULL',
    [userId, groupId]
  );

  for (const menuId of menuIds) {
    await client.query(
      'INSERT INTO settings.group_modules (group_id, menu_id, created_by) VALUES ($1, $2, $3)',
      [groupId, menuId, userId]
    );
  }
}

async function syncPermissions(client, groupId, permissions, userId) {
  // permissions is an array of { module_id, permission_id }
  await client.query(
    'UPDATE settings.group_permissions SET deleted_at = NOW(), deleted_by = $1 WHERE group_id = $2 AND deleted_at IS NULL',
    [userId, groupId]
  );

  for (const perm of permissions) {
    await client.query(
      'INSERT INTO settings.group_permissions (group_id, module_id, permission_id, created_by) VALUES ($1, $2, $3, $4)',
      [groupId, perm.module_id, perm.permission_id, userId]
    );
  }
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.groups SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.groups SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

module.exports = { findAll, findById, findByIdWithPermissions, findByCodeActive, getDropdown, create, update, softDelete, softDeleteMultiple };
