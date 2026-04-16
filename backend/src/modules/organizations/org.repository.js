const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `o.*, cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;
const JOINS = 'LEFT JOIN settings.users cb ON o.created_by = cb.id LEFT JOIN settings.users ub ON o.updated_by = ub.id';

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: 'settings.organizations',
    alias: 'o',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['o.name', 'o.reg_no', 'o.email', 'o.primary_contact_no'],
    filterableColumns: ['o.name', 'o.reg_no', 'o.email', 'o.is_active'],
    sortableColumns: ['o.name', 'o.reg_no', 'o.email', 'o.is_active', 'o.created_at'],
    defaultSortBy: 'o.created_at',
    defaultSortOrder: 'DESC',
    ...(viewOwnUserId ? { extraWhere: 'o.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.organizations o
    ${JOINS}
    WHERE o.id = $1 AND o.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.organizations (name, reg_no, email, primary_contact_code, primary_contact_no, alternate_contact_code, alternate_contact_no, website, social_facebook, social_instagram, social_twitter, social_linkedin, social_youtube, is_active, notes, created_by, updated_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *
  `, [
    data.name, data.reg_no || null, data.email || null,
    data.primary_contact_code || '+91', data.primary_contact_no || null,
    data.alternate_contact_code || '+91', data.alternate_contact_no || null,
    data.website || null,
    data.social_facebook || null, data.social_instagram || null,
    data.social_twitter || null, data.social_linkedin || null, data.social_youtube || null,
    data.is_active !== undefined ? data.is_active : true, data.notes || null,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.organizations SET
      name=$1, reg_no=$2, email=$3, primary_contact_code=$4, primary_contact_no=$5,
      alternate_contact_code=$6, alternate_contact_no=$7, website=$8,
      social_facebook=$9, social_instagram=$10, social_twitter=$11, social_linkedin=$12, social_youtube=$13,
      is_active=$14, notes=$15, updated_by=$16, updated_at=NOW()
    WHERE id=$17 RETURNING *
  `, [
    data.name || current.name,
    data.reg_no !== undefined ? data.reg_no : current.reg_no,
    data.email !== undefined ? data.email : current.email,
    data.primary_contact_code || current.primary_contact_code,
    data.primary_contact_no !== undefined ? data.primary_contact_no : current.primary_contact_no,
    data.alternate_contact_code || current.alternate_contact_code,
    data.alternate_contact_no !== undefined ? data.alternate_contact_no : current.alternate_contact_no,
    data.website !== undefined ? data.website : current.website,
    data.social_facebook !== undefined ? data.social_facebook : current.social_facebook,
    data.social_instagram !== undefined ? data.social_instagram : current.social_instagram,
    data.social_twitter !== undefined ? data.social_twitter : current.social_twitter,
    data.social_linkedin !== undefined ? data.social_linkedin : current.social_linkedin,
    data.social_youtube !== undefined ? data.social_youtube : current.social_youtube,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.notes !== undefined ? data.notes : current.notes,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.organizations SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.organizations SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

async function checkUnique(field, value, excludeId = null) {
  let query = `SELECT id FROM settings.organizations WHERE LOWER(${field}) = LOWER($1) AND deleted_at IS NULL`;
  const params = [value.trim()];
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function findByField(field, value) {
  const result = await db.query(`SELECT * FROM settings.organizations WHERE ${field} = $1 AND deleted_at IS NULL`, [value]);
  return result.rows[0] || null;
}

async function findDropdown({ page, size, search }) {
  const offset = (page - 1) * size;
  let where = 'WHERE is_active = true AND deleted_at IS NULL';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }

  const countResult = await db.query(`SELECT COUNT(*) FROM settings.organizations ${where}`, params);
  const totalCount = parseInt(countResult.rows[0].count);

  params.push(size, offset);
  const result = await db.query(
    `SELECT id, name FROM settings.organizations ${where} ORDER BY name LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data: result.rows,
    pagination: { page, size, total_count: totalCount, total_pages: Math.ceil(totalCount / size) },
  };
}

module.exports = { findAll, findById, create, update, softDelete, softDeleteMultiple, checkUnique, findByField, findDropdown };
