const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');

const TABLE = 'student.registrations';

const SELECT_FIELDS = `
  r.id, r.student_profile_id, r.registration_no, r.registration_date,
  r.notes, r.is_active, r.created_at, r.updated_at,
  CASE WHEN r.enquiry_id IS NOT NULL
    THEN json_build_object(
      'id', eq.id, 'enquiry_no', eq.enquiry_no, 'enquiry_date', eq.enquiry_date,
      'status', eq.status,
      'display_label', eq.enquiry_no || ' (' || INITCAP(REPLACE(eq.status::text, '_', ' ')) || ')'
    )
    ELSE NULL
  END AS enquiry,
  CASE WHEN r.sanctioned_class_id IS NOT NULL
    THEN json_build_object('id', sc.id, 'name', sc.name, 'code', sc.code)
    ELSE NULL
  END AS sanctioned_class,
  CASE WHEN r.academic_year_id IS NOT NULL
    THEN json_build_object('id', ay.id, 'label', ay.academic_year)
    ELSE NULL
  END AS academic_year,
  json_build_object('id', sp.id, 'full_name', sp.full_name, 'profile_no', sp.profile_no) AS student_profile,
  json_build_object('id', cb.id, 'full_name', cb.full_name) AS created_by,
  json_build_object('id', ub.id, 'full_name', ub.full_name) AS updated_by
`;

const JOINS = `
  LEFT JOIN student.student_profiles sp ON sp.id = r.student_profile_id
  LEFT JOIN student.enquiries eq        ON eq.id = r.enquiry_id            AND eq.deleted_at IS NULL
  LEFT JOIN academic.class_generals sc  ON sc.id = r.sanctioned_class_id   AND sc.deleted_at IS NULL
  LEFT JOIN academic.academic_years ay  ON ay.id = r.academic_year_id      AND ay.deleted_at IS NULL
  LEFT JOIN settings.users cb           ON cb.id = r.created_by
  LEFT JOIN settings.users ub           ON ub.id = r.updated_by
`;

async function findAll(profileId, query) {
  const clauses = [`r.student_profile_id = $1`];
  const params  = [profileId];

  return paginate({
    table: TABLE,
    alias: 'r',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['r.registration_no', 'eq.enquiry_no', 'sc.name', 'sc.code'],
    filterableColumns: ['r.is_active'],
    exactColumns: ['r.enquiry_id', 'r.sanctioned_class_id', 'r.academic_year_id'],
    sortableColumns: ['r.registration_no', 'r.registration_date', 'r.is_active', 'r.created_at'],
    defaultSortBy: 'r.created_at',
    defaultSortOrder: 'DESC',
    extraWhere: clauses.join(' AND '),
    extraWhereParams: params,
  }, query);
}

async function findById(id, profileId) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} r
    ${JOINS}
    WHERE r.id = $1 AND r.student_profile_id = $2 AND r.deleted_at IS NULL
  `, [id, profileId]);
  return result.rows[0] || null;
}

async function checkConflict(profileId, enquiryId, sanctionedClassId, excludeId = null) {
  let query = `
    SELECT id FROM ${TABLE}
    WHERE student_profile_id = $1
      AND enquiry_id = $2
      AND sanctioned_class_id = $3
      AND deleted_at IS NULL
  `;
  const params = [profileId, enquiryId, sanctionedClassId];
  if (excludeId) {
    params.push(excludeId);
    query += ` AND id != $${params.length}`;
  }
  const result = await db.query(query, params);
  return result.rows[0] || null;
}

async function create(profileId, data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (
      student_profile_id, enquiry_id, registration_no, registration_date,
      academic_year_id, sanctioned_class_id, notes, is_active,
      created_by, updated_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $9
    ) RETURNING id
  `, [
    profileId, data.enquiry_id, data.registration_no, data.registration_date,
    data.academic_year_id, data.sanctioned_class_id,
    data.notes || null,
    data.is_active !== undefined ? data.is_active : true,
    userId,
  ]);
  return result.rows[0].id;
}

async function update(id, profileId, data, userId) {
  await db.query(`
    UPDATE ${TABLE} SET
      enquiry_id          = $1,
      registration_date   = $2,
      academic_year_id    = $3,
      sanctioned_class_id = $4,
      notes               = $5,
      is_active           = $6,
      updated_by          = $7,
      updated_at          = NOW()
    WHERE id = $8 AND student_profile_id = $9 AND deleted_at IS NULL
  `, [
    data.enquiry_id,
    data.registration_date,
    data.academic_year_id,
    data.sanctioned_class_id,
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

module.exports = { findAll, findById, checkConflict, create, update, softDelete, softDeleteMultiple };
