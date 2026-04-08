const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `mod.*, mn.name AS menu_name, cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;
const JOINS = 'LEFT JOIN settings.menus mn ON mod.menu_id = mn.id LEFT JOIN settings.users cb ON mod.created_by = cb.id LEFT JOIN settings.users ub ON mod.updated_by = ub.id';

async function findAll(query) {
  return paginate({
    table: 'settings.modules',
    alias: 'mod',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['mod.name', 'mod.code', 'mod.route'],
    filterableColumns: ['mod.name', 'mod.code', 'mod.menu_id', 'mod.is_active'],
    sortableColumns: ['mod.name', 'mod.code', 'mod.display_order', 'mod.is_active', 'mod.created_at', 'mn.name'],
    defaultSortBy: 'mod.display_order',
    defaultSortOrder: 'ASC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.modules mod
    ${JOINS}
    WHERE mod.id = $1 AND mod.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.modules (menu_id, name, code, icon, route, display_order, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    data.menu_id, data.name, data.code, data.icon || null, data.route || null,
    data.display_order || 0,
    data.is_active !== undefined ? data.is_active : true,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.modules SET
      menu_id=$1, name=$2, code=$3, icon=$4, route=$5, display_order=$6, is_active=$7, updated_by=$8, updated_at=NOW()
    WHERE id=$9 RETURNING *
  `, [
    data.menu_id || current.menu_id,
    data.name || current.name,
    data.code || current.code,
    data.icon !== undefined ? data.icon : current.icon,
    data.route !== undefined ? data.route : current.route,
    data.display_order !== undefined ? data.display_order : current.display_order,
    data.is_active !== undefined ? data.is_active : current.is_active,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.modules SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function checkUnique(field, value, excludeId = null) {
  let query = `SELECT id FROM settings.modules WHERE LOWER(${field}) = LOWER($1) AND deleted_at IS NULL`;
  const params = [value.trim()];
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function findByMenuId(menuId) {
  const result = await db.query(`
    SELECT id, name, code, icon, route, display_order
    FROM settings.modules
    WHERE menu_id = $1 AND deleted_at IS NULL
    ORDER BY display_order ASC
  `, [menuId]);
  return result.rows;
}

async function findAllActive() {
  const result = await db.query(`
    SELECT mod.id, mod.name, mod.code, mod.icon, mod.route, mod.display_order, mod.menu_id, mn.name AS menu_name
    FROM settings.modules mod
    LEFT JOIN settings.menus mn ON mod.menu_id = mn.id
    WHERE mod.is_active = true AND mod.deleted_at IS NULL
    ORDER BY mod.display_order ASC
  `);
  return result.rows;
}

module.exports = { findAll, findById, create, update, softDelete, checkUnique, findByMenuId, findAllActive };
