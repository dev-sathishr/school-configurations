const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `g.id, g.name, g.code, g.description, g.is_active,
  g.created_by, g.updated_by, g.created_at, g.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = 'LEFT JOIN settings.users cb ON g.created_by = cb.id LEFT JOIN settings.users ub ON g.updated_by = ub.id';

async function findAll(query) {
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
  const result = await db.query(`
    INSERT INTO settings.groups (name, code, description, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, code, description, is_active, created_at
  `, [
    data.name, data.code, data.description || null,
    data.is_active !== undefined ? data.is_active : true,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.groups SET
      name = $1, code = $2, description = $3, is_active = $4,
      updated_by = $5, updated_at = NOW()
    WHERE id = $6
    RETURNING id, name, code, description, is_active, updated_at
  `, [
    data.name || current.name,
    data.code || current.code,
    data.description !== undefined ? (data.description || null) : current.description,
    data.is_active !== undefined ? data.is_active : current.is_active,
    userId, id,
  ]);
  return result.rows[0];
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

module.exports = { findAll, findById, findByCodeActive, getDropdown, create, update, softDelete, softDeleteMultiple };
