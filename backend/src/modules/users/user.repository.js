const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `u.id, u.username, u.full_name, u.email, u.phone, u.group_id, u.is_active,
  u.last_login, u.created_by, u.updated_by, u.created_at, u.updated_at,
  g.name AS group_name, g.code AS group_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN settings.groups g ON u.group_id = g.id
  LEFT JOIN settings.users cb ON u.created_by = cb.id
  LEFT JOIN settings.users ub ON u.updated_by = ub.id`;

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: 'settings.users',
    alias: 'u',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['u.full_name', 'u.username', 'u.email', 'u.phone'],
    filterableColumns: ['u.username', 'u.full_name', 'u.email', 'u.phone', 'u.group_id', 'u.is_active'],
    sortableColumns: ['u.username', 'u.full_name', 'u.email', 'u.phone', 'g.name', 'u.is_active', 'u.created_at', 'u.last_login'],
    defaultSortBy: 'u.created_at',
    defaultSortOrder: 'DESC',
    ...(viewOwnUserId ? { extraWhere: 'u.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.users u
    ${JOINS}
    WHERE u.id = $1 AND u.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByUsername(username) {
  const result = await db.query(
    `SELECT u.*, g.code AS group_code, g.name AS group_name
     FROM settings.users u
     LEFT JOIN settings.groups g ON u.group_id = g.id
     WHERE u.username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

async function findByUsernameActive(username) {
  const result = await db.query('SELECT * FROM settings.users WHERE username = $1 AND deleted_at IS NULL', [username]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.users (username, password, full_name, email, phone, group_id, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, username, full_name, email, phone, group_id, is_active, created_at
  `, [
    data.username, data.hashedPassword, data.full_name,
    data.email || null, data.phone || null,
    data.group_id || null, data.is_active !== undefined ? data.is_active : true,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.users SET
      username = $1, password = $2, full_name = $3, email = $4, phone = $5,
      group_id = $6, is_active = $7, updated_by = $8, updated_at = NOW()
    WHERE id = $9
    RETURNING id, username, full_name, email, phone, group_id, is_active, updated_at
  `, [
    data.username || current.username,
    data.hashedPassword || current.password,
    data.full_name || current.full_name,
    data.email !== undefined ? (data.email || null) : current.email,
    data.phone !== undefined ? (data.phone || null) : current.phone,
    data.group_id !== undefined ? (data.group_id || null) : current.group_id,
    data.is_active !== undefined ? data.is_active : current.is_active,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.users SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.users SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

async function updateLastLogin(id) {
  await db.query('UPDATE settings.users SET last_login = NOW() WHERE id = $1', [id]);
}

async function findProfileById(id) {
  const result = await db.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.group_id, u.is_active, u.last_login, u.created_at,
       g.name AS group_name, g.code AS group_code
     FROM settings.users u
     LEFT JOIN settings.groups g ON u.group_id = g.id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findById, findByUsername, findByUsernameActive, create, update, softDelete, softDeleteMultiple, updateLastLogin, findProfileById };
