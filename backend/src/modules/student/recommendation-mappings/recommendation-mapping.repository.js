const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'student.recommendation_mappings';

const SELECT_FIELDS = `
  rm.id, rm.student_profile_id, rm.recommender_id, rm.enquiry_id,
  rm.notes, rm.is_active, rm.created_at, rm.updated_at,
  json_build_object(
    'id', r.id, 'name', r.name, 'category', r.category,
    'contact_code', r.contact_code, 'contact_no', r.contact_no, 'email', r.email,
    'occupation', r.occupation
  ) AS recommender,
  CASE WHEN rm.enquiry_id IS NOT NULL
    THEN json_build_object('id', eq.id, 'enquiry_no', eq.enquiry_no, 'enquiry_date', eq.enquiry_date, 'status', eq.status)
    ELSE NULL
  END AS enquiry,
  json_build_object('id', cb.id, 'full_name', cb.full_name) AS created_by,
  json_build_object('id', ub.id, 'full_name', ub.full_name) AS updated_by
`;

const JOINS = `
  LEFT JOIN student.recommenders r ON r.id = rm.recommender_id AND r.deleted_at IS NULL
  LEFT JOIN student.enquiries eq ON eq.id = rm.enquiry_id AND eq.deleted_at IS NULL
  LEFT JOIN settings.users cb ON cb.id = rm.created_by
  LEFT JOIN settings.users ub ON ub.id = rm.updated_by
`;

async function findAll(profileId, query) {
  return paginate({
    table: TABLE,
    alias: 'rm',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['r.name', 'r.contact_no', 'eq.enquiry_no'],
    filterableColumns: ['rm.is_active'],
    exactColumns: ['rm.recommender_id', 'rm.enquiry_id'],
    sortableColumns: ['r.name', 'rm.is_active', 'rm.created_at'],
    defaultSortBy: 'rm.created_at',
    defaultSortOrder: 'DESC',
    extraWhere: 'rm.student_profile_id = ?',
    extraWhereParams: [profileId],
  }, query);
}

async function findById(id, profileId) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} rm
    ${JOINS}
    WHERE rm.id = $1 AND rm.student_profile_id = $2 AND rm.deleted_at IS NULL
  `, [id, profileId]);
  return result.rows[0] || null;
}

async function create(profileId, data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (student_profile_id, recommender_id, enquiry_id, notes, is_active, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id
  `, [
    profileId, data.recommender_id,
    data.enquiry_id || null,
    data.notes || null,
    data.is_active !== undefined ? data.is_active : true,
    userId,
  ]);
  return result.rows[0].id;
}

async function update(id, profileId, data, userId) {
  await db.query(`
    UPDATE ${TABLE} SET
      recommender_id = $1, enquiry_id = $2, notes = $3, is_active = $4,
      updated_by = $5, updated_at = NOW()
    WHERE id = $6 AND student_profile_id = $7 AND deleted_at IS NULL
  `, [
    data.recommender_id,
    data.enquiry_id || null,
    data.notes || null,
    data.is_active !== undefined ? data.is_active : true,
    userId, id, profileId,
  ]);
}

async function softDelete(id, profileId, userId) {
  await db.query(`
    UPDATE ${TABLE}
    SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
    WHERE id = $2 AND student_profile_id = $3 AND deleted_at IS NULL
  `, [userId, id, profileId]);
}

async function softDeleteMultiple(ids, profileId, userId) {
  await db.query(`
    UPDATE ${TABLE}
    SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
    WHERE id = ANY($2::uuid[]) AND student_profile_id = $3 AND deleted_at IS NULL
  `, [userId, ids, profileId]);
}

module.exports = { findAll, findById, create, update, softDelete, softDeleteMultiple };
