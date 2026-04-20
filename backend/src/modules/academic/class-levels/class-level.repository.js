const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `cl.*, cg.name AS class_name, cg.code AS class_code,
  loc.name AS location_name, loc.code AS location_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN academic.class_generals cg ON cl.class_general_id = cg.id
  LEFT JOIN settings.locations loc ON cl.location_id = loc.id
  LEFT JOIN settings.users cb ON cl.created_by = cb.id
  LEFT JOIN settings.users ub ON cl.updated_by = ub.id`;

async function findAll(query) {
  const extraWhere = query.class_general_id ? 'cl.class_general_id = ?' : '';
  const extraWhereParams = query.class_general_id ? [query.class_general_id] : [];

  return paginate({
    table: 'academic.class_levels',
    alias: 'cl',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['cl.code', 'cl.section', 'cg.name'],
    filterableColumns: ['cl.code', 'cl.section', 'cl.is_active', 'cl.class_general_id'],
    sortableColumns: ['cl.code', 'cl.section', 'cl.capacity', 'cl.is_active', 'cl.created_at', 'cg.name', 'loc.name'],
    defaultSortBy: 'cl.created_at',
    defaultSortOrder: 'DESC',
    extraWhere,
    extraWhereParams,
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM academic.class_levels cl
    ${JOINS}
    WHERE cl.id = $1 AND cl.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO academic.class_levels (class_general_id, code, section, capacity, location_id, is_active, notes, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [
    data.class_general_id, data.code, data.section || null, data.capacity || 0,
    data.location_id || null,
    data.is_active !== undefined ? data.is_active : true,
    data.notes || null, userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE academic.class_levels SET
      class_general_id = $1, code = $2, section = $3, capacity = $4, location_id = $5, is_active = $6,
      notes = $7, updated_by = $8, updated_at = NOW()
    WHERE id = $9 RETURNING *
  `, [
    data.class_general_id || current.class_general_id,
    data.code || current.code,
    data.section !== undefined ? (data.section || null) : current.section,
    data.capacity !== undefined ? data.capacity : current.capacity,
    data.location_id !== undefined ? (data.location_id || null) : current.location_id,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.notes !== undefined ? data.notes : current.notes,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE academic.class_levels SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE academic.class_levels SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

async function checkUnique(classGeneralId, code, excludeId = null) {
  let query = 'SELECT id FROM academic.class_levels WHERE class_general_id = $1 AND LOWER(code) = LOWER($2) AND deleted_at IS NULL';
  const params = [classGeneralId, code.trim()];
  if (excludeId) {
    query += ' AND id != $3';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

module.exports = { findAll, findById, create, update, softDelete, softDeleteMultiple, checkUnique };
