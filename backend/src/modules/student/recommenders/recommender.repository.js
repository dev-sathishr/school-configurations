const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const { saveAddresses, getAddresses } = require('../../../shared/helpers/address.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'student.recommenders';

const SELECT_FIELDS = `
  r.id, r.name, r.category, r.contact_code, r.contact_no, r.email,
  r.occupation, r.notes, r.is_active, r.created_at, r.updated_at,
  json_build_object('id', cb.id, 'full_name', cb.full_name) AS created_by,
  json_build_object('id', ub.id, 'full_name', ub.full_name) AS updated_by
`;

const JOINS = `
  LEFT JOIN settings.users cb ON cb.id = r.created_by
  LEFT JOIN settings.users ub ON ub.id = r.updated_by
`;

async function findAll(query) {
  return paginate({
    table: TABLE,
    alias: 'r',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['r.name', 'r.contact_no', 'r.email', 'r.occupation'],
    filterableColumns: ['r.category', 'r.is_active'],
    sortableColumns: ['r.name', 'r.category', 'r.contact_no', 'r.is_active', 'r.created_at'],
    defaultSortBy: 'r.created_at',
    defaultSortOrder: 'DESC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} r
    ${JOINS}
    WHERE r.id = $1 AND r.deleted_at IS NULL
  `, [id]);
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  row.addresses = await getAddresses('recommender', id);
  return row;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (name, category, contact_code, contact_no, email, occupation, notes, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id
  `, [
    data.name, data.category,
    data.contact_code || '+91', data.contact_no,
    data.email || null, data.occupation || null,
    data.notes || null,
    data.is_active !== undefined ? data.is_active : true,
    userId,
  ]);
  const id = result.rows[0].id;
  if (data.addresses?.length) {
    await saveAddresses('recommender', id, data.addresses, userId);
  }
  return id;
}

async function update(id, data, userId) {
  await db.query(`
    UPDATE ${TABLE} SET
      name = $1, category = $2, contact_code = $3, contact_no = $4,
      email = $5, occupation = $6, notes = $7, is_active = $8,
      updated_by = $9, updated_at = NOW()
    WHERE id = $10 AND deleted_at IS NULL
  `, [
    data.name, data.category,
    data.contact_code || '+91', data.contact_no,
    data.email || null, data.occupation || null,
    data.notes || null,
    data.is_active !== undefined ? data.is_active : true,
    userId, id,
  ]);
  if (data.addresses !== undefined) {
    await saveAddresses('recommender', id, data.addresses || [], userId);
  }
}

async function checkUnique(contactNo, excludeId = null) {
  return repoHelper.checkUnique({ table: TABLE, field: 'contact_no', value: contactNo, excludeId });
}

async function getDropdown(query) {
  const search = query.search ? `%${query.search}%` : null;
  const result = await db.query(`
    SELECT id, name, contact_no, category
    FROM ${TABLE}
    WHERE deleted_at IS NULL AND is_active = true
      ${search ? 'AND (LOWER(name) LIKE LOWER($1) OR contact_no LIKE $1)' : ''}
    ORDER BY name
    LIMIT 50
  `, search ? [search] : []);
  return result.rows;
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId });
}

module.exports = { findAll, findById, create, update, checkUnique, getDropdown, softDelete, softDeleteMultiple };
