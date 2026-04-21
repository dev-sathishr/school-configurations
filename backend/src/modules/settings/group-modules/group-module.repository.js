const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'settings.group_modules';

const SELECT_FIELDS = `gm.id, gm.group_id, gm.menu_id, gm.updated_at,
  g.name AS group_name, g.code AS group_code,
  men.name AS menu_name, men.code AS menu_code,
  gm.created_by, gm.created_at,
  cb.full_name AS created_by_name`;

const JOINS = `LEFT JOIN settings.groups g ON gm.group_id = g.id
  LEFT JOIN settings.menus men ON gm.menu_id = men.id
  LEFT JOIN settings.users cb ON gm.created_by = cb.id`;

async function findAll(query) {
  return paginate({
    table: 'settings.group_modules',
    alias: 'gm',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['g.name', 'men.name'],
    filterableColumns: ['gm.group_id', 'gm.menu_id'],
    sortableColumns: ['g.name', 'men.name', 'gm.created_at'],
    defaultSortBy: 'gm.created_at',
    defaultSortOrder: 'DESC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.group_modules gm
    ${JOINS}
    WHERE gm.id = $1 AND gm.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByGroupAndModule(groupId, moduleId) {
  const result = await db.query(
    'SELECT * FROM settings.group_modules WHERE group_id = $1 AND menu_id = $2 AND deleted_at IS NULL',
    [groupId, moduleId]
  );
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.group_modules (group_id, menu_id, created_by)
    VALUES ($1, $2, $3)
    RETURNING id, group_id, menu_id, created_at, updated_at
  `, [data.group_id, data.menu_id, userId]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE settings.group_modules SET
      group_id = $1, menu_id = $2, updated_at = NOW()
    WHERE id = $3
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $4::timestamptz)
    RETURNING id, group_id, menu_id, updated_at
  `, [
    data.group_id || current.group_id,
    data.menu_id || current.menu_id,
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

module.exports = { findAll, findById, findByGroupAndModule, create, update, softDelete, softDeleteMultiple };
