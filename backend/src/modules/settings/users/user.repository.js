const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `u.id, u.username, u.full_name, u.email, u.phone_code, u.phone, u.group_id, u.is_active,
  u.last_login, u.created_by, u.updated_by, u.created_at, u.updated_at,
  g.name AS group_name, g.code AS group_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name,
  pf.id AS profile_file_id`;

const JOINS = `LEFT JOIN settings.groups g ON u.group_id = g.id
  LEFT JOIN settings.users cb ON u.created_by = cb.id
  LEFT JOIN settings.users ub ON u.updated_by = ub.id
  LEFT JOIN LATERAL (SELECT f.id FROM settings.files f WHERE f.entity_type = 'user' AND f.entity_id = u.id AND f.file_type = 'profile_image' AND f.deleted_at IS NULL ORDER BY f.created_at DESC LIMIT 1) pf ON true`;

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
    INSERT INTO settings.users (username, password, full_name, email, phone_code, phone, group_id, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, username, full_name, email, phone_code, phone, group_id, is_active, created_at
  `, [
    data.username, data.hashedPassword, data.full_name,
    data.email || null, data.phone_code || '+91', data.phone || null,
    data.group_id || null, data.is_active !== undefined ? data.is_active : true,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.users SET
      username = $1, password = $2, full_name = $3, email = $4, phone_code = $5, phone = $6,
      group_id = $7, is_active = $8, updated_by = $9, updated_at = NOW()
    WHERE id = $10
    RETURNING id, username, full_name, email, phone_code, phone, group_id, is_active, updated_at
  `, [
    data.username || current.username,
    data.hashedPassword || current.password,
    data.full_name || current.full_name,
    data.email !== undefined ? (data.email || null) : current.email,
    data.phone_code || current.phone_code || '+91',
    data.phone !== undefined ? (data.phone || null) : current.phone,
    data.group_id !== undefined ? (data.group_id || null) : current.group_id,
    data.is_active !== undefined ? data.is_active : current.is_active,
    userId, id,
  ]);
  return result.rows[0];
}

const repoHelper = require('../../../shared/helpers/repo.helper');
const TABLE = 'settings.users';

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId });
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

async function getUserLocations(userId) {
  const result = await db.query(
    `SELECT l.id, l.name, l.code, ul.is_default FROM settings.user_locations ul
     JOIN settings.locations l ON ul.location_id = l.id AND l.deleted_at IS NULL
     WHERE ul.user_id = $1 ORDER BY ul.is_default DESC, l.name`,
    [userId]
  );
  return result.rows;
}

async function saveUserLocations(userId, locationIds, defaultLocationId, createdBy) {
  await db.query('DELETE FROM settings.user_locations WHERE user_id = $1', [userId]);
  if (!locationIds || locationIds.length === 0) return;
  for (const locId of locationIds) {
    const isDefault = locId === defaultLocationId;
    await db.query(
      'INSERT INTO settings.user_locations (user_id, location_id, is_default, created_by) VALUES ($1, $2, $3, $4)',
      [userId, locId, isDefault, createdBy]
    );
  }
}

module.exports = { findAll, findById, findByUsername, findByUsernameActive, create, update, softDelete, softDeleteMultiple, updateLastLogin, findProfileById, getUserLocations, saveUserLocations };
