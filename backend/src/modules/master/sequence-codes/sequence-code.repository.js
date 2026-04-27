const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'settings.sequence_codes';

const SELECT_FIELDS = `sc.id, sc.code, sc.name, sc.is_active,
  sc.created_by, sc.updated_by, sc.created_at, sc.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN settings.users cb ON sc.created_by = cb.id
  LEFT JOIN settings.users ub ON sc.updated_by = ub.id`;

async function findAll(query) {
  return paginate({
    table: TABLE,
    alias: 'sc',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['sc.code', 'sc.name'],
    filterableColumns: ['sc.code', 'sc.name', 'sc.is_active'],
    sortableColumns: ['sc.name', 'sc.code', 'sc.is_active', 'sc.created_at'],
    defaultSortBy: 'sc.name',
    defaultSortOrder: 'ASC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.sequence_codes sc
    ${JOINS}
    WHERE sc.id = $1 AND sc.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByCode(code) {
  const result = await db.query(
    'SELECT * FROM settings.sequence_codes WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL',
    [code]
  );
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: TABLE,
    alias: 'sc',
    selectFields: 'sc.id, sc.code, sc.name',
    searchColumns: ['sc.code', 'sc.name'],
    filterableColumns: [],
    sortableColumns: ['sc.name', 'sc.code'],
    defaultSortBy: 'sc.name',
    defaultSortOrder: 'ASC',
    extraWhere: 'sc.is_active = true',
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.sequence_codes (code, name, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, code, name, is_active, created_at
  `, [
    data.code,
    data.name,
    data.is_active !== undefined ? data.is_active : true,
    userId,
    userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE settings.sequence_codes SET
      name = $1, code = $2, is_active = $3,
      updated_by = $4, updated_at = NOW()
    WHERE id = $5
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $6::timestamptz)
    RETURNING id, code, name, is_active, updated_at
  `, [
    data.name || current.name,
    data.code || current.code,
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

module.exports = { findAll, findById, findByCode, getDropdown, create, update, softDelete, softDeleteMultiple };
