const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'settings.menu_modules';

const SELECT_FIELDS = `mm.id, mm.menu_id, mm.module_id, mm.display_order, mm.updated_at,
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
    RETURNING id, menu_id, module_id, display_order, created_at, updated_at
  `, [data.menu_id, data.module_id, data.display_order || 0, userId]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE settings.menu_modules SET
      menu_id = $1, module_id = $2, display_order = $3, updated_at = NOW()
    WHERE id = $4
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $5::timestamptz)
    RETURNING id, menu_id, module_id, display_order, updated_at
  `, [
    data.menu_id || current.menu_id,
    data.module_id || current.module_id,
    data.display_order !== undefined ? data.display_order : current.display_order,
    id,
    expectedUpdatedAt,
  ]);
  return result.rows[0] || null;
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId });
}

module.exports = { findAll, findById, findByMenuAndModule, create, update, softDelete, softDeleteMultiple };
