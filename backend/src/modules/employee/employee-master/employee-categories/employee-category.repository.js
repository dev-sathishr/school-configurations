const db = require('../../../../config/database');
const { paginate } = require('../../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../../shared/helpers/repo.helper');

const TABLE = 'employee.employee_categories';

const SELECT_FIELDS = `ec.id, ec.name, ec.code, ec.description, ec.is_active,
  ec.created_by, ec.updated_by, ec.created_at, ec.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name,
  COALESCE(gc.group_count, 0) AS employee_group_count`;

const JOINS = `LEFT JOIN settings.users cb ON ec.created_by = cb.id
  LEFT JOIN settings.users ub ON ec.updated_by = ub.id
  LEFT JOIN LATERAL (SELECT COUNT(*)::int AS group_count FROM settings.employee_groups eg WHERE eg.employee_category_id = ec.id AND eg.deleted_at IS NULL) gc ON true`;

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: TABLE,
    alias: 'ec',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['ec.name', 'ec.code', 'ec.description'],
    filterableColumns: ['ec.name', 'ec.code', 'ec.is_active'],
    sortableColumns: ['ec.name', 'ec.code', 'ec.is_active', 'ec.created_at'],
    defaultSortBy: 'ec.created_at',
    defaultSortOrder: 'DESC',
    ...(viewOwnUserId ? { extraWhere: 'ec.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} ec
    ${JOINS}
    WHERE ec.id = $1 AND ec.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByCodeActive(code) {
  const result = await db.query(
    `SELECT * FROM ${TABLE} WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
    [code]
  );
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: TABLE,
    alias: 'ec',
    selectFields: 'ec.id, ec.name, ec.code',
    searchColumns: ['ec.name', 'ec.code'],
    filterableColumns: [],
    sortableColumns: ['ec.name', 'ec.code'],
    defaultSortBy: 'ec.name',
    defaultSortOrder: 'ASC',
    extraWhere: 'ec.is_active = true',
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (name, code, description, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, code, description, is_active, created_at
  `, [
    data.name,
    data.code,
    data.description || null,
    data.is_active !== undefined ? data.is_active : true,
    userId,
    userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE ${TABLE} SET
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

module.exports = {
  findAll,
  findById,
  findByCodeActive,
  getDropdown,
  create,
  update,
  softDelete,
  softDeleteMultiple,
};
