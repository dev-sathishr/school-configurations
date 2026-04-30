const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'master.document_types';

const SELECT_FIELDS = `
  dt.id, dt.code, dt.name, dt.category, dt.is_active, dt.notes,
  dt.document_no_label, dt.validation_pattern,
  dt.created_by, dt.updated_by, dt.created_at, dt.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `
  LEFT JOIN settings.users cb ON dt.created_by = cb.id
  LEFT JOIN settings.users ub ON dt.updated_by = ub.id`;

async function findAll(query) {
  return paginate({
    table: TABLE,
    alias: 'dt',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['dt.code', 'dt.name', 'dt.category'],
    filterableColumns: ['dt.code', 'dt.name', 'dt.category', 'dt.is_active'],
    sortableColumns: ['dt.name', 'dt.code', 'dt.category', 'dt.is_active', 'dt.created_at'],
    defaultSortBy: 'dt.category, dt.name',
    defaultSortOrder: 'ASC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM master.document_types dt
    ${JOINS}
    WHERE dt.id = $1 AND dt.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByCode(code) {
  const result = await db.query(
    `SELECT * FROM master.document_types WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
    [code]
  );
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: TABLE,
    alias: 'dt',
    selectFields: 'dt.id, dt.code, dt.name, dt.category, dt.document_no_label, dt.validation_pattern',
    searchColumns: ['dt.code', 'dt.name'],
    filterableColumns: ['dt.category'],
    sortableColumns: ['dt.name', 'dt.code', 'dt.category'],
    defaultSortBy: 'dt.category, dt.name',
    defaultSortOrder: 'ASC',
    extraWhere: 'dt.is_active = true',
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO master.document_types
      (code, name, category, is_active, notes, document_no_label, validation_pattern, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    data.code,
    data.name,
    data.category,
    data.is_active !== undefined ? data.is_active : true,
    data.notes || null,
    data.document_no_label || null,
    data.validation_pattern || null,
    userId,
    userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE master.document_types SET
      name               = $1,
      code               = $2,
      category           = $3,
      is_active          = $4,
      notes              = $5,
      document_no_label  = $6,
      validation_pattern = $7,
      updated_by         = $8,
      updated_at         = NOW()
    WHERE id = $9
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $10::timestamptz)
    RETURNING id, updated_at
  `, [
    data.name               !== undefined ? data.name               : current.name,
    data.code               !== undefined ? data.code               : current.code,
    data.category           !== undefined ? data.category           : current.category,
    data.is_active          !== undefined ? data.is_active          : current.is_active,
    data.notes              !== undefined ? data.notes              : current.notes,
    data.document_no_label  !== undefined ? (data.document_no_label  || null) : current.document_no_label,
    data.validation_pattern !== undefined ? (data.validation_pattern || null) : current.validation_pattern,
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
