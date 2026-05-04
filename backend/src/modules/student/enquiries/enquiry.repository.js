const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'student.enquiries';

const SELECT_FIELDS = `
  eq.id,
  eq.student_profile_id,
  eq.enquiry_no,
  eq.enquiry_no || ' (' || INITCAP(REPLACE(eq.status::text, '_', ' ')) || ')' AS display_label,
  eq.academic_year_id,
  eq.enquiry_date,
  eq.enquired_by,
  eq.relation_type,
  eq.contact_code,
  eq.contact_no,
  eq.enquired_class AS enquired_class_id,
  COALESCE(
    CASE
      WHEN cg.id IS NOT NULL AND cg.code IS NOT NULL AND cg.code <> ''
        THEN cg.name || ' (' || cg.code || ')'
      WHEN cg.id IS NOT NULL
        THEN cg.name
      ELSE NULL
    END,
    eq.enquired_class
  ) AS enquired_class_label,
  eq.current_school,
  eq.current_class,
  eq.current_curriculum AS current_curriculum_id,
  eq.status,
  eq.notes,
  eq.is_active,
  eq.created_at,
  eq.updated_at,
  json_build_object('id', sp.id, 'full_name', sp.full_name) AS student_profile,
  CASE WHEN sp.location_id IS NOT NULL
    THEN json_build_object('id', loc.id, 'name', loc.name, 'code', loc.code)
    ELSE NULL
  END AS location,
  json_build_object('id', cb.id, 'full_name', cb.full_name) AS created_by,
  json_build_object('id', ub.id, 'full_name', ub.full_name) AS updated_by,
  CASE WHEN eq.academic_year_id IS NOT NULL
    THEN json_build_object('id', ay.id, 'label', ay.academic_year)
    ELSE NULL
  END AS academic_year,
  CASE WHEN eq.enquired_class IS NOT NULL
    THEN json_build_object('id', eq.enquired_class, 'name', cg.name, 'code', cg.code)
    ELSE NULL
  END AS enquired_class,
  CASE WHEN eq.current_curriculum IS NOT NULL
    THEN json_build_object('id', eq.current_curriculum, 'name', cu.name)
    ELSE NULL
  END AS current_curriculum
`;

const JOINS = `
  LEFT JOIN student.student_profiles sp ON sp.id = eq.student_profile_id
  LEFT JOIN settings.locations loc ON loc.id = sp.location_id
  LEFT JOIN settings.users cb ON cb.id = eq.created_by
  LEFT JOIN settings.users ub ON ub.id = eq.updated_by
  LEFT JOIN academic.academic_years ay ON ay.id = eq.academic_year_id
  LEFT JOIN academic.class_generals cg ON cg.id::text = eq.enquired_class AND cg.deleted_at IS NULL
  LEFT JOIN master.curriculum cu ON cu.id::text = eq.current_curriculum AND cu.deleted_at IS NULL
`;

async function findAll(profileId, query) {
  const clauses = [`eq.student_profile_id = $1`];
  const params  = [profileId];

  // Convenience flag used by the recommendation form's enquiry dropdown:
  // ?active=true narrows to enquiries that are still open or being followed up.
  // ?include_id=<uuid> forces a specific enquiry to remain in the result even
  // if it doesn't match `active` — used in edit mode so the currently-linked
  // (possibly closed) enquiry stays visible in the dropdown.
  if (String(query.active) === 'true') {
    if (query.include_id) {
      params.push(query.include_id);
      clauses.push(`(eq.status IN ('open', 'follow_up') OR eq.id = $${params.length})`);
    } else {
      clauses.push(`eq.status IN ('open', 'follow_up')`);
    }
  }

  return paginate({
    table: TABLE,
    alias: 'eq',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['eq.enquiry_no', 'eq.enquired_by', 'eq.contact_no', 'eq.enquired_class', 'cg.name', 'cg.code'],
    filterableColumns: ['eq.status', 'eq.relation_type', 'eq.is_active'],
    sortableColumns: ['eq.enquiry_no', 'eq.enquiry_date', 'eq.enquired_by', 'eq.status', 'eq.created_at'],
    defaultSortBy: 'eq.created_at',
    defaultSortOrder: 'DESC',
    extraWhere: clauses.join(' AND '),
    extraWhereParams: params,
  }, query);
}

async function findById(id, profileId) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} eq
    ${JOINS}
    WHERE eq.id = $1
      AND eq.student_profile_id = $2
      AND eq.deleted_at IS NULL
  `, [id, profileId]);
  return result.rows[0] || null;
}

async function create(profileId, data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (
      student_profile_id, enquiry_no, academic_year_id, enquiry_date,
      enquired_by, relation_type, contact_code, contact_no,
      enquired_class, current_school, current_class, current_curriculum,
      status, notes,
      created_by, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15
    )
    RETURNING id
  `, [
    profileId,
    data.enquiry_no,
    data.academic_year_id || null,
    data.enquiry_date,
    data.enquired_by,
    data.relation_type,
    data.contact_code || '+91',
    data.contact_no,
    data.enquired_class,
    data.current_school      || null,
    data.current_class       || null,
    data.current_curriculum  || null,
    data.status              || 'open',
    data.notes               || null,
    userId,
  ]);
  return result.rows[0].id;
}

async function update(id, profileId, data, userId) {
  await db.query(`
    UPDATE ${TABLE} SET
      academic_year_id   = $1,
      enquiry_date       = $2,
      enquired_by        = $3,
      relation_type      = $4,
      contact_code       = $5,
      contact_no         = $6,
      enquired_class     = $7,
      current_school     = $8,
      current_class      = $9,
      current_curriculum = $10,
      status             = $11,
      notes              = $12,
      updated_by         = $13,
      updated_at         = NOW()
    WHERE id = $14
      AND student_profile_id = $15
      AND deleted_at IS NULL
  `, [
    data.academic_year_id    || null,
    data.enquiry_date,
    data.enquired_by,
    data.relation_type,
    data.contact_code        || '+91',
    data.contact_no,
    data.enquired_class,
    data.current_school      || null,
    data.current_class       || null,
    data.current_curriculum  || null,
    data.status              || 'open',
    data.notes               || null,
    userId,
    id,
    profileId,
  ]);
}

async function softDelete(id, profileId, userId) {
  await db.query(`
    UPDATE ${TABLE}
    SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
    WHERE id = $2
      AND student_profile_id = $3
      AND deleted_at IS NULL
  `, [userId, id, profileId]);
}

async function closeActiveEnquiries(profileId, userId) {
  await db.query(`
    UPDATE ${TABLE}
    SET status = 'closed', updated_by = $1, updated_at = NOW()
    WHERE student_profile_id = $2
      AND status IN ('open', 'follow_up')
      AND deleted_at IS NULL
  `, [userId, profileId]);
}

async function softDeleteMultiple(ids, profileId, userId) {
  await db.query(`
    UPDATE ${TABLE}
    SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
    WHERE id = ANY($2::uuid[])
      AND student_profile_id = $3
      AND deleted_at IS NULL
  `, [userId, ids, profileId]);
}

module.exports = { findAll, findById, create, update, softDelete, softDeleteMultiple, closeActiveEnquiries };
