const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'student.assessments';

const SELECT_FIELDS = `
  a.id, a.student_profile_id, a.assessment_no, a.assessment_date,
  a.type, a.completed, a.result, a.grade, a.marks, a.notes, a.is_active,
  a.created_at, a.updated_at,
  CASE WHEN a.enquiry_id IS NOT NULL
    THEN json_build_object(
      'id', eq.id, 'enquiry_no', eq.enquiry_no, 'enquiry_date', eq.enquiry_date,
      'status', eq.status,
      'display_label', eq.enquiry_no || ' (' || INITCAP(REPLACE(eq.status::text, '_', ' ')) || ')'
    )
    ELSE NULL
  END AS enquiry,
  CASE WHEN a.assessed_by_id IS NOT NULL
    THEN json_build_object('id', ab.id, 'full_name', ab.full_name)
    ELSE NULL
  END AS assessed_by,
  CASE WHEN a.sanctioned_class_id IS NOT NULL
    THEN json_build_object('id', sc.id, 'name', sc.name, 'code', sc.code)
    ELSE NULL
  END AS sanctioned_class,
  CASE WHEN a.academic_year_id IS NOT NULL
    THEN json_build_object('id', ay.id, 'label', ay.academic_year)
    ELSE NULL
  END AS academic_year,
  json_build_object('id', sp.id, 'full_name', sp.full_name, 'profile_no', sp.profile_no) AS student_profile,
  json_build_object('id', cb.id, 'full_name', cb.full_name) AS created_by,
  json_build_object('id', ub.id, 'full_name', ub.full_name) AS updated_by
`;

const JOINS = `
  LEFT JOIN student.student_profiles sp ON sp.id = a.student_profile_id
  LEFT JOIN student.enquiries eq        ON eq.id = a.enquiry_id            AND eq.deleted_at IS NULL
  LEFT JOIN settings.users ab           ON ab.id = a.assessed_by_id
  LEFT JOIN academic.class_generals sc  ON sc.id = a.sanctioned_class_id   AND sc.deleted_at IS NULL
  LEFT JOIN academic.academic_years ay  ON ay.id = a.academic_year_id      AND ay.deleted_at IS NULL
  LEFT JOIN settings.users cb           ON cb.id = a.created_by
  LEFT JOIN settings.users ub           ON ub.id = a.updated_by
`;

async function findAll(profileId, query) {
  const clauses = [`a.student_profile_id = $1`];
  const params  = [profileId];

  return paginate({
    table: TABLE,
    alias: 'a',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['a.assessment_no', 'eq.enquiry_no', 'a.grade', 'ab.full_name'],
    filterableColumns: ['a.type', 'a.result', 'a.completed', 'a.is_active'],
    exactColumns: ['a.enquiry_id'],
    sortableColumns: ['a.assessment_no', 'a.assessment_date', 'a.type', 'a.result', 'a.created_at'],
    defaultSortBy: 'a.created_at',
    defaultSortOrder: 'DESC',
    extraWhere: clauses.join(' AND '),
    extraWhereParams: params,
  }, query);
}

async function findById(id, profileId) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} a
    ${JOINS}
    WHERE a.id = $1 AND a.student_profile_id = $2 AND a.deleted_at IS NULL
  `, [id, profileId]);
  return result.rows[0] || null;
}

async function create(profileId, data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (
      student_profile_id, enquiry_id, assessment_no, assessment_date,
      type, assessed_by_id, sanctioned_class_id, academic_year_id,
      completed, result, grade, marks, notes, is_active,
      created_by, updated_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15
    ) RETURNING id
  `, [
    profileId, data.enquiry_id, data.assessment_no, data.assessment_date,
    data.type,
    data.assessed_by_id     || null,
    data.sanctioned_class_id || null,
    data.academic_year_id    || null,
    data.completed === true || data.completed === 'true',
    data.result || 'pending',
    data.grade  || null,
    data.marks !== undefined && data.marks !== null && data.marks !== '' ? Number(data.marks) : null,
    data.notes  || null,
    data.is_active !== undefined ? data.is_active : true,
    userId,
  ]);
  return result.rows[0].id;
}

async function update(id, profileId, data, userId) {
  await db.query(`
    UPDATE ${TABLE} SET
      enquiry_id          = $1,
      assessment_date     = $2,
      type                = $3,
      assessed_by_id      = $4,
      sanctioned_class_id = $5,
      academic_year_id    = $6,
      completed           = $7,
      result              = $8,
      grade               = $9,
      marks               = $10,
      notes               = $11,
      is_active           = $12,
      updated_by          = $13,
      updated_at          = NOW()
    WHERE id = $14 AND student_profile_id = $15 AND deleted_at IS NULL
  `, [
    data.enquiry_id,
    data.assessment_date,
    data.type,
    data.assessed_by_id     || null,
    data.sanctioned_class_id || null,
    data.academic_year_id    || null,
    data.completed === true || data.completed === 'true',
    data.result || 'pending',
    data.grade  || null,
    data.marks !== undefined && data.marks !== null && data.marks !== '' ? Number(data.marks) : null,
    data.notes  || null,
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
