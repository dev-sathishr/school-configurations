const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `l.id, l.name, l.code, l.type, l.email,
  l.primary_contact_code, l.primary_contact_no, l.alternate_contact_code, l.alternate_contact_no,
  l.is_active, l.notes, l.created_at, l.updated_at,
  org.id AS org_id, org.name AS org_name,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN settings.organizations org ON l.organization_id = org.id
  LEFT JOIN settings.users cb ON l.created_by = cb.id
  LEFT JOIN settings.users ub ON l.updated_by = ub.id`;

const DETAIL_SELECT = `l.id, l.organization_id, l.name, l.code, l.type, l.email,
  l.primary_contact_code, l.primary_contact_no, l.alternate_contact_code, l.alternate_contact_no,
  l.is_active, l.notes, l.created_by, l.updated_by, l.created_at, l.updated_at,
  org.id AS org_id, org.name AS org_name,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: 'settings.locations',
    alias: 'l',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['l.name', 'l.code', 'l.email', 'org.name'],
    filterableColumns: ['l.name', 'l.code', 'l.type', 'l.is_active', 'l.organization_id'],
    sortableColumns: ['l.name', 'l.code', 'l.type', 'l.is_active', 'l.created_at', 'org.name'],
    defaultSortBy: 'l.created_at',
    defaultSortOrder: 'DESC',
    ...(viewOwnUserId ? { extraWhere: 'l.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${DETAIL_SELECT}
    FROM settings.locations l
    ${JOINS}
    WHERE l.id = $1 AND l.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByField(field, value) {
  const result = await db.query(`SELECT * FROM settings.locations WHERE ${field} = $1 AND deleted_at IS NULL`, [value]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.locations (organization_id, name, code, type, email, primary_contact_code, primary_contact_no, alternate_contact_code, alternate_contact_no, is_active, notes, created_by, updated_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `, [
    data.organization_id, data.name, data.code || null, data.type || 'branch', data.email || null,
    data.primary_contact_code || '+91', data.primary_contact_no || null,
    data.alternate_contact_code || '+91', data.alternate_contact_no || null,
    data.is_active !== undefined ? data.is_active : true, data.notes || null, userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.locations SET
      organization_id=$1, name=$2, code=$3, type=$4, email=$5,
      primary_contact_code=$6, primary_contact_no=$7, alternate_contact_code=$8, alternate_contact_no=$9,
      is_active=$10, notes=$11, updated_by=$12, updated_at=NOW()
    WHERE id=$13 RETURNING *
  `, [
    data.organization_id || current.organization_id,
    data.name || current.name,
    data.code !== undefined ? data.code : current.code,
    data.type || current.type,
    data.email !== undefined ? data.email : current.email,
    data.primary_contact_code || current.primary_contact_code,
    data.primary_contact_no !== undefined ? data.primary_contact_no : current.primary_contact_no,
    data.alternate_contact_code || current.alternate_contact_code,
    data.alternate_contact_no !== undefined ? data.alternate_contact_no : current.alternate_contact_no,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.notes !== undefined ? data.notes : current.notes,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.locations SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.locations SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

async function checkUnique(field, value, excludeId = null, extraConditions = {}) {
  let query = `SELECT id FROM settings.locations WHERE LOWER(${field}) = LOWER($1) AND deleted_at IS NULL`;
  const params = [value.trim()];
  let paramIdx = 1;

  if (extraConditions.organization_id) {
    paramIdx++;
    query += ` AND organization_id = $${paramIdx}`;
    params.push(extraConditions.organization_id);
  }

  if (excludeId) {
    paramIdx++;
    query += ` AND id != $${paramIdx}`;
    params.push(excludeId);
  }

  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function findDropdown({ page, size, search }) {
  const offset = (page - 1) * size;
  let where = 'WHERE l.is_active = true AND l.deleted_at IS NULL';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (l.name ILIKE $${params.length} OR l.code ILIKE $${params.length})`;
  }

  const countResult = await db.query(`SELECT COUNT(*) FROM settings.locations l ${where}`, params);
  const totalCount = parseInt(countResult.rows[0].count);

  params.push(size, offset);
  const result = await db.query(
    `SELECT l.id, l.name, l.code, org.name AS org_name
     FROM settings.locations l
     LEFT JOIN settings.organizations org ON l.organization_id = org.id
     ${where} ORDER BY l.name LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data: result.rows.map(r => ({ id: r.id, name: r.code ? `${r.name} (${r.code})` : r.name })),
    pagination: { page, size, total_count: totalCount, total_pages: Math.ceil(totalCount / size) },
  };
}

module.exports = { findAll, findById, findByField, create, update, softDelete, softDeleteMultiple, checkUnique, findDropdown };
