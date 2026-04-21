const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'settings.employee_groups';

const SELECT_FIELDS = `eg.id, eg.employee_category_id, eg.name, eg.code, eg.description, eg.is_active,
  eg.created_by, eg.updated_by, eg.created_at, eg.updated_at,
  ec.name AS employee_category_name, ec.code AS employee_category_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN settings.employee_categories ec ON eg.employee_category_id = ec.id AND ec.deleted_at IS NULL
  LEFT JOIN settings.users cb ON eg.created_by = cb.id
  LEFT JOIN settings.users ub ON eg.updated_by = ub.id`;

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: TABLE,
    alias: 'eg',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['eg.name', 'eg.code', 'eg.description', 'ec.name', 'ec.code'],
    filterableColumns: ['eg.name', 'eg.code', 'eg.is_active', 'eg.employee_category_id'],
    sortableColumns: ['eg.name', 'eg.code', 'eg.is_active', 'eg.created_at', 'ec.name'],
    defaultSortBy: 'eg.created_at',
    defaultSortOrder: 'DESC',
    ...(viewOwnUserId ? { extraWhere: 'eg.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} eg
    ${JOINS}
    WHERE eg.id = $1 AND eg.deleted_at IS NULL
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
  const extraWhereParts = ['eg.is_active = true'];
  const extraWhereParams = [];

  if (query.employee_category_id) {
    extraWhereParts.push('eg.employee_category_id = ?');
    extraWhereParams.push(query.employee_category_id);
  }

  return paginate({
    table: TABLE,
    alias: 'eg',
    selectFields: 'eg.id, eg.employee_category_id, eg.name, eg.code',
    searchColumns: ['eg.name', 'eg.code'],
    filterableColumns: [],
    sortableColumns: ['eg.name', 'eg.code'],
    defaultSortBy: 'eg.name',
    defaultSortOrder: 'ASC',
    extraWhere: extraWhereParts.join(' AND '),
    extraWhereParams,
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (employee_category_id, name, code, description, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, employee_category_id, name, code, description, is_active, created_at
  `, [
    data.employee_category_id,
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
      employee_category_id = $1, name = $2, code = $3, description = $4, is_active = $5,
      updated_by = $6, updated_at = NOW()
    WHERE id = $7
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $8::timestamptz)
    RETURNING id, employee_category_id, name, code, description, is_active, updated_at
  `, [
    data.employee_category_id || current.employee_category_id,
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
