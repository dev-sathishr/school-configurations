const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'academic.class_generals';

const SELECT_FIELDS = `c.*, cb.full_name AS created_by_name, ub.full_name AS updated_by_name,
  COALESCE(lc.level_count, 0) AS level_count`;
const JOINS = `LEFT JOIN settings.users cb ON c.created_by = cb.id
  LEFT JOIN settings.users ub ON c.updated_by = ub.id
  LEFT JOIN LATERAL (SELECT COUNT(*)::int AS level_count FROM academic.class_levels cl WHERE cl.class_general_id = c.id AND cl.deleted_at IS NULL) lc ON true`;

async function findAll(query) {
  return paginate({
    table: 'academic.class_generals',
    alias: 'c',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['c.name', 'c.code'],
    filterableColumns: ['c.name', 'c.code', 'c.academic_level', 'c.is_active'],
    sortableColumns: ['c.name', 'c.code', 'c.academic_level', 'c.strength', 'c.is_active', 'c.created_at', 'level_count'],
    defaultSortBy: 'c.created_at',
    defaultSortOrder: 'DESC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM academic.class_generals c
    ${JOINS}
    WHERE c.id = $1 AND c.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO academic.class_generals (name, code, strength, academic_level, is_active, notes, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    data.name, data.code || null, data.strength || 0,
    data.academic_level || 'primary', data.is_active !== undefined ? data.is_active : true,
    data.notes || null, userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE academic.class_generals SET
      name = $1, code = $2, strength = $3, academic_level = $4,
      is_active = $5, notes = $6, updated_by = $7, updated_at = NOW()
    WHERE id = $8 RETURNING *
  `, [
    data.name || current.name,
    data.code !== undefined ? (data.code || null) : current.code,
    data.strength !== undefined ? data.strength : current.strength,
    data.academic_level || current.academic_level,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.notes !== undefined ? data.notes : current.notes,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId });
}

async function checkUnique(field, value, excludeId = null) {
  let query = `SELECT id FROM academic.class_generals WHERE LOWER(${field}) = LOWER($1) AND deleted_at IS NULL`;
  const params = [value.trim()];
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function findDropdown({ page, size, search }) {
  const offset = (page - 1) * size;
  let where = 'WHERE is_active = true AND deleted_at IS NULL';
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length})`;
  }
  const countResult = await db.query(`SELECT COUNT(*) FROM academic.class_generals ${where}`, params);
  const totalCount = parseInt(countResult.rows[0].count);
  params.push(size, offset);
  const result = await db.query(
    `SELECT id, name, code FROM academic.class_generals ${where} ORDER BY name LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    data: result.rows.map(r => ({ id: r.id, name: r.code ? `${r.name} (${r.code})` : r.name })),
    pagination: { page, size, total_count: totalCount, total_pages: Math.ceil(totalCount / size) },
  };
}

module.exports = { findAll, findById, create, update, softDelete, softDeleteMultiple, checkUnique, findDropdown };
