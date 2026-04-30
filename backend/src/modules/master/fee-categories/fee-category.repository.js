const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'master.fee_categories';

const SELECT_FIELDS = `
  fc.id, fc.code, fc.name, fc.description, fc.is_active,
  fc.created_by, fc.updated_by, fc.created_at, fc.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `
  LEFT JOIN settings.users cb ON fc.created_by = cb.id
  LEFT JOIN settings.users ub ON fc.updated_by = ub.id`;

async function findAll(query) {
  return paginate({
    table: TABLE,
    alias: 'fc',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['fc.code', 'fc.name'],
    filterableColumns: ['fc.code', 'fc.name', 'fc.is_active'],
    sortableColumns: ['fc.code', 'fc.name', 'fc.is_active', 'fc.created_at'],
    defaultSortBy: 'fc.name',
    defaultSortOrder: 'ASC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM master.fee_categories fc
    ${JOINS}
    WHERE fc.id = $1 AND fc.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByCode(code) {
  const result = await db.query(
    `SELECT id FROM master.fee_categories WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
    [code]
  );
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: TABLE,
    alias: 'fc',
    selectFields: 'fc.id, fc.code, fc.name',
    searchColumns: ['fc.code', 'fc.name'],
    filterableColumns: [],
    sortableColumns: ['fc.name', 'fc.code'],
    defaultSortBy: 'fc.name',
    defaultSortOrder: 'ASC',
    extraWhere: 'fc.is_active = true',
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO master.fee_categories
      (code, name, description, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    data.code,
    data.name,
    data.description || null,
    data.is_active !== undefined ? data.is_active : true,
    userId,
    userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE master.fee_categories SET
      code        = $1,
      name        = $2,
      description = $3,
      is_active   = $4,
      updated_by  = $5,
      updated_at  = NOW()
    WHERE id = $6
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $7::timestamptz)
    RETURNING id, updated_at
  `, [
    data.code        !== undefined ? data.code        : current.code,
    data.name        !== undefined ? data.name        : current.name,
    data.description !== undefined ? (data.description || null) : current.description,
    data.is_active   !== undefined ? data.is_active   : current.is_active,
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
