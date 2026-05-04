const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const { applyLocationScope, scopedFindByIdClause } = require('../../../shared/helpers/location-scope.helper');

const SELECT_FIELDS = `cl.*, cg.name AS class_name, cg.code AS class_code, cg.strength AS class_strength,
  COALESCE(ac.allocated_capacity, 0) AS class_allocated_capacity,
  loc.name AS location_name, loc.code AS location_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN academic.class_generals cg ON cl.class_general_id = cg.id
  LEFT JOIN settings.locations loc ON cl.location_id = loc.id
  LEFT JOIN settings.users cb ON cl.created_by = cb.id
  LEFT JOIN settings.users ub ON cl.updated_by = ub.id
  LEFT JOIN LATERAL (SELECT COALESCE(SUM(capacity), 0)::int AS allocated_capacity FROM academic.class_levels x WHERE x.class_general_id = cl.class_general_id AND x.deleted_at IS NULL) ac ON true`;

async function findAll(query, scope) {
  const clauses = [];
  const clauseParams = [];

  if (query.class_general_id) {
    clauses.push('cl.class_general_id = ?');
    clauseParams.push(query.class_general_id);
  }

  const loc = applyLocationScope({
    column: 'cl.location_id',
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
    table: 'academic.class_levels',
    alias: 'cl',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['cl.name', 'cl.code', 'cl.section', 'cg.name'],
    filterableColumns: ['cl.code', 'cl.section', 'cl.is_active'],
    exactColumns: ['cl.class_general_id'],
    sortableColumns: ['cl.name', 'cl.code', 'cl.section', 'cl.capacity', 'cl.is_active', 'cl.created_at', 'cg.name', 'loc.name'],
    defaultSortBy: 'cl.created_at',
    defaultSortOrder: 'DESC',
    extraWhere: clauses.join(' AND '),
    extraWhereParams: clauseParams,
  }, query);
}

async function findById(id, scope) {
  const scopeClause = scopedFindByIdClause(scope, 'cl.location_id', 2);
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM academic.class_levels cl
    ${JOINS}
    WHERE cl.id = $1 AND cl.deleted_at IS NULL ${scopeClause.clause}
  `, [id, ...scopeClause.params]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO academic.class_levels (class_general_id, name, code, section, capacity, location_id, is_active, notes, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
  `, [
    data.class_general_id, data.name || null, data.code, data.section || null, data.capacity || 0,
    data.location_id || null,
    data.is_active !== undefined ? data.is_active : true,
    data.notes || null, userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE academic.class_levels SET
      class_general_id = $1, name = $2, code = $3, section = $4, capacity = $5, location_id = $6, is_active = $7,
      notes = $8, updated_by = $9, updated_at = NOW()
    WHERE id = $10
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $11::timestamptz)
    RETURNING *
  `, [
    data.class_general_id || current.class_general_id,
    data.name !== undefined ? (data.name || null) : current.name,
    data.code || current.code,
    data.section !== undefined ? (data.section || null) : current.section,
    data.capacity !== undefined ? data.capacity : current.capacity,
    data.location_id !== undefined ? (data.location_id || null) : current.location_id,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.notes !== undefined ? data.notes : current.notes,
    userId, id, expectedUpdatedAt,
  ]);
  return result.rows[0] || null;
}

const repoHelper = require('../../../shared/helpers/repo.helper');
const TABLE = 'academic.class_levels';

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId, scope) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId, scopeColumn: 'location_id', scope });
}

async function checkUnique(classGeneralId, locationId, code, excludeId = null) {
  let query = 'SELECT id FROM academic.class_levels WHERE class_general_id = $1 AND location_id = $2 AND LOWER(code) = LOWER($3) AND deleted_at IS NULL';
  const params = [classGeneralId, locationId, code.trim()];
  if (excludeId) {
    query += ' AND id != $4';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function getClassStrength(classGeneralId) {
  const result = await db.query(
    'SELECT strength FROM academic.class_generals WHERE id = $1 AND deleted_at IS NULL',
    [classGeneralId]
  );
  return result.rows[0]?.strength ?? 0;
}

async function getTotalAllocatedCapacity(classGeneralId, excludeId = null) {
  let query = 'SELECT COALESCE(SUM(capacity), 0)::int AS total FROM academic.class_levels WHERE class_general_id = $1 AND deleted_at IS NULL';
  const params = [classGeneralId];
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows[0]?.total ?? 0;
}

module.exports = { findAll, findById, create, update, softDelete, softDeleteMultiple, checkUnique, getClassStrength, getTotalAllocatedCapacity };
