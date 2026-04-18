const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `mm.id, mm.menu_id, mm.module_id, mm.display_order,
  men.name AS menu_name, men.code AS menu_code,
  mod.name AS module_name, mod.code AS module_code,
  mm.created_by, mm.created_at,
  cb.full_name AS created_by_name`;

const JOINS = `LEFT JOIN settings.menus men ON mm.menu_id = men.id
  LEFT JOIN settings.modules mod ON mm.module_id = mod.id
  LEFT JOIN settings.users cb ON mm.created_by = cb.id`;

async function findAll(query) {
  return paginate({
    table: 'settings.menu_modules',
    alias: 'mm',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['men.name', 'mod.name'],
    filterableColumns: ['mm.module_id', 'mm.menu_id'],
    sortableColumns: ['men.name', 'mod.name', 'mm.display_order', 'mm.created_at'],
    defaultSortBy: 'mm.display_order',
    defaultSortOrder: 'ASC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.menu_modules mm
    ${JOINS}
    WHERE mm.id = $1 AND mm.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByMenuAndModule(menuId, moduleId) {
  const result = await db.query(
    'SELECT * FROM settings.menu_modules WHERE menu_id = $1 AND module_id = $2 AND deleted_at IS NULL',
    [menuId, moduleId]
  );
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.menu_modules (menu_id, module_id, display_order, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, menu_id, module_id, display_order, created_at
  `, [data.menu_id, data.module_id, data.display_order || 0, userId]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.menu_modules SET
      menu_id = $1, module_id = $2, display_order = $3
    WHERE id = $4
    RETURNING id, menu_id, module_id, display_order
  `, [
    data.menu_id || current.menu_id,
    data.module_id || current.module_id,
    data.display_order !== undefined ? data.display_order : current.display_order,
    id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.menu_modules SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.menu_modules SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

module.exports = { findAll, findById, findByMenuAndModule, create, update, softDelete, softDeleteMultiple };
