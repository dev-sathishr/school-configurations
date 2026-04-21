const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');
const { applyLocationScope, scopedFindByIdClause } = require('../../../shared/helpers/location-scope.helper');

const TABLE = 'academic.academic_years';

const SELECT_FIELDS = `ay.*, loc.name AS location_name, loc.code AS location_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN settings.locations loc ON ay.location_id = loc.id
  LEFT JOIN settings.users cb ON ay.created_by = cb.id
  LEFT JOIN settings.users ub ON ay.updated_by = ub.id`;

async function findAll(query, scope) {
  const clauses = [];
  const clauseParams = [];

  const loc = applyLocationScope({
    column: 'ay.location_id',
    scope,
    requested: query.location_ids,
  });
  if (loc.empty) {
    return { data: [], pagination: { page: 1, size: 10, total_count: 0, total_pages: 0 } };
  }
  if (loc.clause) {
    clauses.push(loc.clause);
    clauseParams.push(...loc.params);
  }

  return paginate({
    table: TABLE,
    alias: 'ay',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['ay.academic_year', 'loc.name'],
    filterableColumns: ['ay.academic_year', 'ay.is_active', 'ay.is_default'],
    sortableColumns: ['ay.academic_year', 'ay.start_date', 'ay.end_date', 'ay.is_default', 'ay.is_active', 'ay.created_at', 'loc.name'],
    defaultSortBy: 'ay.start_date',
    defaultSortOrder: 'DESC',
    extraWhere: clauses.join(' AND '),
    extraWhereParams: clauseParams,
  }, query);
}

async function findById(id, scope) {
  const scopeClause = scopedFindByIdClause(scope, 'ay.location_id', 2);
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} ay
    ${JOINS}
    WHERE ay.id = $1 AND ay.deleted_at IS NULL ${scopeClause.clause}
  `, [id, ...scopeClause.params]);
  return result.rows[0] || null;
}

async function checkUnique(locationId, academicYear, excludeId = null) {
  return repoHelper.checkUnique({
    table: TABLE,
    field: 'academic_year',
    value: academicYear,
    excludeId,
    extraConditions: { location_id: locationId },
  });
}

/**
 * Finds any existing year at the same location whose date range overlaps
 * with the proposed one. Strict overlap — adjacency (existing ends exactly
 * when new starts) is allowed. Returns the conflicting row's `academic_year`
 * label so the error message can be specific, or `null` if clean.
 */
async function findOverlap(locationId, startDate, endDate, excludeId = null) {
  const params = [locationId, startDate, endDate];
  let sql = `
    SELECT academic_year, start_date, end_date FROM ${TABLE}
    WHERE location_id = $1
      AND deleted_at IS NULL
      AND start_date < $3
      AND end_date > $2
  `;
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND id <> $${params.length}`;
  }
  sql += ' LIMIT 1';
  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE}
      (location_id, academic_year, start_date, end_date, is_default, is_active, notes, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING *
  `, [
    data.location_id,
    data.academic_year,
    data.start_date,
    data.end_date,
    data.is_default === true,
    data.is_active !== undefined ? data.is_active : true,
    data.notes || null,
    userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE ${TABLE} SET
      location_id = $1, academic_year = $2, start_date = $3, end_date = $4,
      is_default = $5, is_active = $6, notes = $7,
      updated_by = $8, updated_at = NOW()
    WHERE id = $9
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $10::timestamptz)
    RETURNING *
  `, [
    data.location_id || current.location_id,
    data.academic_year || current.academic_year,
    data.start_date || current.start_date,
    data.end_date || current.end_date,
    data.is_default !== undefined ? data.is_default : current.is_default,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.notes !== undefined ? data.notes : current.notes,
    userId, id, expectedUpdatedAt,
  ]);
  return result.rows[0] || null;
}

/**
 * Clear the `is_default` flag on every other year for this location.
 * Called from the service whenever an incoming save sets `is_default = true`,
 * so the "only one default per location" invariant holds without relying
 * solely on the partial unique index (which only errors, doesn't swap).
 */
async function clearOtherDefaults(locationId, exceptId = null) {
  const params = [locationId];
  let sql = `UPDATE ${TABLE} SET is_default = false, updated_at = NOW()
             WHERE location_id = $1 AND is_default = true AND deleted_at IS NULL`;
  if (exceptId) {
    params.push(exceptId);
    sql += ` AND id <> $${params.length}`;
  }
  await db.query(sql, params);
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId, scope) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId, scopeColumn: 'location_id', scope });
}

module.exports = { findAll, findById, checkUnique, findOverlap, create, update, clearOtherDefaults, softDelete, softDeleteMultiple };
