const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `gm.id, gm.group_id, gm.menu_id,
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
    RETURNING id, group_id, menu_id, created_at
  `, [data.group_id, data.menu_id, userId]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.group_modules SET
      group_id = $1, menu_id = $2
    WHERE id = $3
    RETURNING id, group_id, menu_id
  `, [
    data.group_id || current.group_id,
    data.menu_id || current.menu_id,
    id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.group_modules SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.group_modules SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

module.exports = { findAll, findById, findByGroupAndModule, create, update, softDelete, softDeleteMultiple };
