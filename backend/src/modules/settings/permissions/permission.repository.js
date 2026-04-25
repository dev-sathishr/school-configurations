const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'settings.permissions';

const SELECT_FIELDS = `p.id, p.name, p.code, p.description, p.is_active,
  p.created_by, p.updated_by, p.created_at, p.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name,
  COALESCE(gpc.group_permission_count, 0) AS group_permission_count`;

const JOINS = `LEFT JOIN settings.users cb ON p.created_by = cb.id LEFT JOIN settings.users ub ON p.updated_by = ub.id
  LEFT JOIN LATERAL (SELECT COUNT(*)::int AS group_permission_count FROM settings.group_permissions gp WHERE gp.permission_id = p.id) gpc ON true`;

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: 'settings.permissions',
    alias: 'p',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['p.name', 'p.code', 'p.description'],
    filterableColumns: ['p.name', 'p.code', 'p.is_active'],
    sortableColumns: ['p.name', 'p.code', 'p.is_active', 'p.created_at'],
    defaultSortBy: 'p.created_at',
    defaultSortOrder: 'DESC',
    ...(viewOwnUserId ? { extraWhere: 'p.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.permissions p
    ${JOINS}
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByCodeActive(code) {
  const result = await db.query('SELECT * FROM settings.permissions WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL', [code]);
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: 'settings.permissions',
    alias: 'p',
    selectFields: 'p.id, p.name, p.code',
    searchColumns: ['p.name'],
    filterableColumns: [],
    sortableColumns: ['p.name'],
    defaultSortBy: 'p.name',
    defaultSortOrder: 'ASC',
    extraWhere: "p.is_active = true",
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.permissions (name, code, description, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, code, description, is_active, created_at
  `, [
    data.name, data.code, data.description || null,
    data.is_active !== undefined ? data.is_active : true,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE settings.permissions SET
      name = $1, code = $2, description = $3, is_active = $4,
      updated_by = $5, updated_at = NOW()
    WHERE id = $6
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $7::timestamptz)
    RETURNING id, name, code, description, is_active, updated_at
  `, [
    data.name || current.name,
    data.code || current.code,
    data.description !== undefined ? (data.description || null) : current.description,
    data.is_active !== undefined ? data.is_active : current.is_active,
    userId, id,
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

module.exports = { findAll, findById, findByCodeActive, getDropdown, create, update, softDelete, softDeleteMultiple };
