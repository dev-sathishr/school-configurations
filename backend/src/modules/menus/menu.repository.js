const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `m.id, m.name, m.code, m.icon, m.route_path, m.display_order, m.is_active, m.description,
  m.parent_id, p.name AS parent_name,
  m.created_by, m.updated_by, m.created_at, m.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN settings.menus p ON m.parent_id = p.id
  LEFT JOIN settings.users cb ON m.created_by = cb.id
  LEFT JOIN settings.users ub ON m.updated_by = ub.id`;

async function findAll(query) {
  return paginate({
    table: 'settings.menus',
    alias: 'm',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['m.name', 'm.code', 'm.description'],
    filterableColumns: ['m.name', 'm.code', 'm.is_active'],
    sortableColumns: ['m.name', 'm.code', 'm.display_order', 'm.is_active', 'm.created_at'],
    defaultSortBy: 'm.display_order',
    defaultSortOrder: 'ASC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.menus m
    ${JOINS}
    WHERE m.id = $1 AND m.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByCodeActive(code) {
  const result = await db.query('SELECT * FROM settings.menus WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL', [code]);
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: 'settings.menus',
    alias: 'm',
    selectFields: 'm.id, m.name',
    searchColumns: ['m.name'],
    filterableColumns: [],
    sortableColumns: ['m.name'],
    defaultSortBy: 'm.name',
    defaultSortOrder: 'ASC',
    extraWhere: "m.is_active = true",
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.menus (name, code, icon, route_path, display_order, is_active, description, parent_id, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, name, code, icon, route_path, display_order, is_active, description, parent_id, created_at
  `, [
    data.name, data.code, data.icon || null, data.route_path || null,
    data.display_order || 0, data.is_active !== undefined ? data.is_active : true,
    data.description || null, data.parent_id || null, userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.menus SET
      name = $1, code = $2, icon = $3, route_path = $4, display_order = $5,
      is_active = $6, description = $7, parent_id = $8, updated_by = $9, updated_at = NOW()
    WHERE id = $10
    RETURNING id, name, code, icon, route_path, display_order, is_active, description, parent_id, updated_at
  `, [
    data.name || current.name,
    data.code || current.code,
    data.icon !== undefined ? (data.icon || null) : current.icon,
    data.route_path !== undefined ? (data.route_path || null) : current.route_path,
    data.display_order !== undefined ? data.display_order : current.display_order,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.description !== undefined ? (data.description || null) : current.description,
    data.parent_id !== undefined ? (data.parent_id || null) : current.parent_id,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.menus SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.menus SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

module.exports = { findAll, findById, findByCodeActive, getDropdown, create, update, softDelete, softDeleteMultiple };
