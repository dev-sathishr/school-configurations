const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `m.*, cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;
const JOINS = 'LEFT JOIN settings.users cb ON m.created_by = cb.id LEFT JOIN settings.users ub ON m.updated_by = ub.id';

async function findAll(query) {
  return paginate({
    table: 'settings.menus',
    alias: 'm',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['m.name', 'm.code'],
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

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.menus (name, code, icon, display_order, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    data.name, data.code, data.icon || null,
    data.display_order || 0,
    data.is_active !== undefined ? data.is_active : true,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.menus SET
      name=$1, code=$2, icon=$3, display_order=$4, is_active=$5, updated_by=$6, updated_at=NOW()
    WHERE id=$7 RETURNING *
  `, [
    data.name || current.name,
    data.code || current.code,
    data.icon !== undefined ? data.icon : current.icon,
    data.display_order !== undefined ? data.display_order : current.display_order,
    data.is_active !== undefined ? data.is_active : current.is_active,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.menus SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function checkUnique(field, value, excludeId = null) {
  let query = `SELECT id FROM settings.menus WHERE LOWER(${field}) = LOWER($1) AND deleted_at IS NULL`;
  const params = [value.trim()];
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function findAllActive() {
  const result = await db.query(`
    SELECT id, name, code, icon, display_order
    FROM settings.menus
    WHERE is_active = true AND deleted_at IS NULL
    ORDER BY display_order ASC
  `);
  return result.rows;
}

module.exports = { findAll, findById, create, update, softDelete, checkUnique, findAllActive };
