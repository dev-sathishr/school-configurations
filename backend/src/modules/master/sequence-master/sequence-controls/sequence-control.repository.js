const db = require('../../../../config/database');
const { paginate } = require('../../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../../shared/helpers/repo.helper');

const TABLE = 'master.sequence_controls';

const SELECT_FIELDS = `sc.id, sc.sequence_code_id, sc.location_id,
  sc.prefix, sc.suffix, sc.last_no, sc.max_no, sc.digit_length, sc.is_active, sc.notes,
  sc.created_by, sc.updated_by, sc.created_at, sc.updated_at,
  sqc.code AS sequence_code_code, sqc.name AS sequence_code_name,
  l.name AS location_name, l.code AS location_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN master.sequence_codes sqc ON sc.sequence_code_id = sqc.id AND sqc.deleted_at IS NULL
  LEFT JOIN settings.locations l ON sc.location_id = l.id AND l.deleted_at IS NULL
  LEFT JOIN settings.users cb ON sc.created_by = cb.id
  LEFT JOIN settings.users ub ON sc.updated_by = ub.id`;

async function findAll(query) {
  return paginate({
    table: TABLE,
    alias: 'sc',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['sqc.code', 'sqc.name', 'l.name', 'l.code'],
    filterableColumns: ['sc.is_active'],
    exactColumns: ['sc.sequence_code_id', 'sc.location_id'],
    sortableColumns: ['sqc.name', 'l.name', 'sc.prefix', 'sc.last_no', 'sc.is_active', 'sc.created_at'],
    defaultSortBy: 'sc.created_at',
    defaultSortOrder: 'DESC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM master.sequence_controls sc
    ${JOINS}
    WHERE sc.id = $1 AND sc.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByCodeAndLocation(sequenceCodeId, locationId, excludeId = null) {
  const params = [sequenceCodeId, locationId];
  let excludeClause = '';
  if (excludeId) {
    params.push(excludeId);
    excludeClause = `AND sc.id != $${params.length}`;
  }
  const result = await db.query(`
    SELECT sc.id FROM master.sequence_controls sc
    WHERE sc.sequence_code_id = $1 AND sc.location_id = $2
      AND sc.deleted_at IS NULL ${excludeClause}
    LIMIT 1
  `, params);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO master.sequence_controls
      (sequence_code_id, location_id, prefix, suffix, last_no, max_no, digit_length, is_active, notes, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, sequence_code_id, location_id, prefix, suffix, last_no, max_no, digit_length, is_active, notes, created_at
  `, [
    data.sequence_code_id,
    data.location_id,
    data.prefix || null,
    data.suffix || null,
    data.last_no !== undefined ? data.last_no : 0,
    data.max_no || null,
    data.digit_length,
    data.is_active !== undefined ? data.is_active : true,
    data.notes || null,
    userId,
    userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE master.sequence_controls SET
      sequence_code_id = $1, location_id = $2, prefix = $3, suffix = $4,
      last_no = $5, max_no = $6, digit_length = $7, is_active = $8, notes = $9,
      updated_by = $10, updated_at = NOW()
    WHERE id = $11
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $12::timestamptz)
    RETURNING id, sequence_code_id, location_id, prefix, suffix, last_no, max_no, digit_length, is_active, notes, updated_at
  `, [
    data.sequence_code_id !== undefined ? data.sequence_code_id : current.sequence_code_id,
    data.location_id !== undefined ? data.location_id : current.location_id,
    data.prefix !== undefined ? (data.prefix || null) : current.prefix,
    data.suffix !== undefined ? (data.suffix || null) : current.suffix,
    data.last_no !== undefined ? data.last_no : current.last_no,
    data.max_no !== undefined ? (data.max_no || null) : current.max_no,
    data.digit_length !== undefined ? data.digit_length : current.digit_length,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.notes !== undefined ? (data.notes || null) : current.notes,
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

module.exports = { findAll, findById, findByCodeAndLocation, create, update, softDelete, softDeleteMultiple };
