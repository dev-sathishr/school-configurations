const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'settings.designations';

const SELECT_FIELDS = `d.id, d.employee_group_id, d.name, d.code, d.description, d.is_active,
  d.created_by, d.updated_by, d.created_at, d.updated_at,
  eg.name AS employee_group_name, eg.code AS employee_group_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN settings.employee_groups eg ON d.employee_group_id = eg.id AND eg.deleted_at IS NULL
  LEFT JOIN settings.users cb ON d.created_by = cb.id
  LEFT JOIN settings.users ub ON d.updated_by = ub.id`;

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: TABLE,
    alias: 'd',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['d.name', 'd.code', 'd.description', 'eg.name', 'eg.code'],
    filterableColumns: ['d.name', 'd.code', 'd.is_active', 'd.employee_group_id'],
    sortableColumns: ['d.name', 'd.code', 'd.is_active', 'd.created_at', 'eg.name'],
    defaultSortBy: 'd.created_at',
    defaultSortOrder: 'DESC',
    ...(viewOwnUserId ? { extraWhere: 'd.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} d
    ${JOINS}
    WHERE d.id = $1 AND d.deleted_at IS NULL
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
  const extraWhereParts = ['d.is_active = true'];
  const extraWhereParams = [];

  if (query.employee_group_id) {
    extraWhereParts.push('d.employee_group_id = ?');
    extraWhereParams.push(query.employee_group_id);
  }

  return paginate({
    table: TABLE,
    alias: 'd',
    selectFields: 'd.id, d.employee_group_id, d.name, d.code',
    searchColumns: ['d.name', 'd.code'],
    filterableColumns: [],
    sortableColumns: ['d.name', 'd.code'],
    defaultSortBy: 'd.name',
    defaultSortOrder: 'ASC',
    extraWhere: extraWhereParts.join(' AND '),
    extraWhereParams,
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (employee_group_id, name, code, description, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, employee_group_id, name, code, description, is_active, created_at
  `, [
    data.employee_group_id,
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
      employee_group_id = $1, name = $2, code = $3, description = $4, is_active = $5,
      updated_by = $6, updated_at = NOW()
    WHERE id = $7
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $8::timestamptz)
    RETURNING id, employee_group_id, name, code, description, is_active, updated_at
  `, [
    data.employee_group_id || current.employee_group_id,
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
