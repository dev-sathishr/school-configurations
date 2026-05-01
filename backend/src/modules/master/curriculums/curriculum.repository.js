const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'master.curriculum';

const SELECT_FIELDS = `
  c.id, c.name, c.notes, c.is_active,
  c.created_by, c.updated_by, c.created_at, c.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `
  LEFT JOIN settings.users cb ON c.created_by = cb.id
  LEFT JOIN settings.users ub ON c.updated_by = ub.id`;

async function findAll(query) {
  return paginate({
    table: TABLE,
    alias: 'c',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['c.name'],
    filterableColumns: ['c.name', 'c.is_active'],
    sortableColumns: ['c.name', 'c.is_active', 'c.created_at'],
    defaultSortBy: 'c.name',
    defaultSortOrder: 'ASC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} c
    ${JOINS}
    WHERE c.id = $1 AND c.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByName(name) {
  const result = await db.query(
    `SELECT id FROM ${TABLE} WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`,
    [name]
  );
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: TABLE,
    alias: 'c',
    selectFields: 'c.id, c.name',
    searchColumns: ['c.name'],
    filterableColumns: [],
    sortableColumns: ['c.name'],
    defaultSortBy: 'c.name',
    defaultSortOrder: 'ASC',
    extraWhere: 'c.is_active = true',
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE}
      (name, notes, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [
    data.name,
    data.notes || null,
    data.is_active !== undefined ? data.is_active : true,
    userId,
    userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE ${TABLE} SET
      name       = $1,
      notes      = $2,
      is_active  = $3,
      updated_by = $4,
      updated_at = NOW()
    WHERE id = $5
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $6::timestamptz)
    RETURNING id, updated_at
  `, [
    data.name      !== undefined ? data.name : current.name,
    data.notes     !== undefined ? (data.notes || null) : current.notes,
    data.is_active !== undefined ? data.is_active : current.is_active,
    userId,
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

module.exports = { findAll, findById, findByName, getDropdown, create, update, softDelete, softDeleteMultiple };
