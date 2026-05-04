const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');
const { applyLocationScope, scopedFindByIdClause } = require('../../../shared/helpers/location-scope.helper');

const TABLE = 'student.student_profiles';

const SELECT_FIELDS = `
  sp.id, sp.location_id, sp.first_name, sp.middle_name, sp.last_name,
  sp.full_name, sp.dob, sp.gender, sp.blood_group, sp.aadhaar_no,
  sp.nationality, sp.birth_place,
  sp.primary_contact_code, sp.primary_contact_no, sp.email,
  sp.status, sp.is_active, sp.photo_url, sp.notes,
  pf.id AS photo_file_id,
  sp.created_at, sp.updated_at,
  json_build_object('id', loc.id, 'name', loc.name, 'code', loc.code) AS location,
  json_build_object('id', cb.id, 'full_name', cb.full_name) AS created_by,
  json_build_object('id', ub.id, 'full_name', ub.full_name) AS updated_by
`;

const JOINS = `
  LEFT JOIN settings.locations loc ON loc.id = sp.location_id
  LEFT JOIN settings.users cb ON cb.id = sp.created_by
  LEFT JOIN settings.users ub ON ub.id = sp.updated_by
  LEFT JOIN LATERAL (
    SELECT f.id
    FROM settings.files f
    WHERE f.entity_type = 'student_profile'
      AND f.entity_id = sp.id
      AND f.file_type = 'photo'
      AND f.deleted_at IS NULL
    ORDER BY f.created_at DESC
    LIMIT 1
  ) pf ON TRUE
`;

function emptyPage(query) {
  const page = parseInt(query.page) || 1;
  const size = parseInt(query.size) || 10;
  return { data: [], pagination: { page, size, total_count: 0, total_pages: 0 } };
}

async function findAll(query, scope) {
  const clauses = [];
  const params = [];

  if (query.status) {
    params.push(query.status);
    clauses.push(`sp.status = $${params.length}`);
  }

  const loc = applyLocationScope({ column: 'sp.location_id', scope, requested: query.location_ids });
  if (loc.empty) return emptyPage(query);
  if (loc.clause) { clauses.push(loc.clause); params.push(...loc.params); }

  return paginate({
    table: TABLE,
    alias: 'sp',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['sp.first_name', 'sp.last_name', 'sp.middle_name', 'sp.primary_contact_no', 'sp.email'],
    filterableColumns: ['sp.status', 'sp.gender', 'sp.blood_group'],
    exactColumns: ['sp.location_id'],
    sortableColumns: ['sp.first_name', 'sp.last_name', 'sp.dob', 'sp.status', 'sp.created_at'],
    defaultSortBy: 'sp.created_at',
    defaultSortOrder: 'DESC',
    extraWhere: clauses.join(' AND '),
    extraWhereParams: params,
  }, query);
}

async function findById(id, scope) {
  const s = scopedFindByIdClause(scope, 'sp.location_id', 2);
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} sp
    ${JOINS}
    WHERE sp.id = $1 AND sp.deleted_at IS NULL ${s.clause}
  `, [id, ...s.params]);
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO student.student_profiles (
      location_id, first_name, middle_name, last_name,
      dob, gender, blood_group, aadhaar_no, nationality, birth_place,
      primary_contact_code, primary_contact_no, email,
      status, is_active, notes, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING id
  `, [
    data.location_id,
    data.first_name,
    data.middle_name || null,
    data.last_name || null,
    data.dob || null,
    data.gender || null,
    data.blood_group || 'unknown',
    data.aadhaar_no || null,
    data.nationality || 'Indian',
    data.birth_place || null,
    data.primary_contact_code || '+91',
    data.primary_contact_no || null,
    data.email || null,
    data.status || 'profile_created',
    data.is_active !== undefined ? data.is_active : true,
    data.notes || null,
    userId,
    userId,
  ]);
  return result.rows[0].id;
}

async function update(id, data, userId) {
  const result = await db.query(`
    UPDATE student.student_profiles SET
      first_name = COALESCE($1, first_name),
      middle_name = $2,
      last_name = $3,
      dob = $4,
      gender = COALESCE($5::student.gender_type, gender),
      blood_group = COALESCE($6::student.blood_group_type, blood_group),
      aadhaar_no = $7,
      nationality = COALESCE($8, nationality),
      birth_place = $9,
      primary_contact_code = COALESCE($10, primary_contact_code),
      primary_contact_no = $11,
      email = $12,
      status = COALESCE($13::student.profile_status, status),
      is_active = COALESCE($14, is_active),
      notes = $15,
      updated_by = $16,
      updated_at = NOW()
    WHERE id = $17 AND deleted_at IS NULL
    RETURNING id
  `, [
    data.first_name || null,
    data.middle_name !== undefined ? data.middle_name || null : undefined,
    data.last_name !== undefined ? data.last_name || null : undefined,
    data.dob !== undefined ? data.dob || null : undefined,
    data.gender || null,
    data.blood_group || null,
    data.aadhaar_no !== undefined ? data.aadhaar_no || null : undefined,
    data.nationality || null,
    data.birth_place !== undefined ? data.birth_place || null : undefined,
    data.primary_contact_code || null,
    data.primary_contact_no !== undefined ? data.primary_contact_no || null : undefined,
    data.email !== undefined ? data.email || null : undefined,
    data.status || null,
    data.is_active !== undefined ? data.is_active : null,
    data.notes !== undefined ? data.notes || null : undefined,
    userId,
    id,
  ]);
  return result.rows[0] || null;
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId, scope) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId, scopeColumn: 'location_id', scope });
}

async function updateStatus(id, status, userId) {
  await db.query(`
    UPDATE student.student_profiles
    SET status = $1::student.profile_status, updated_by = $2, updated_at = NOW()
    WHERE id = $3 AND deleted_at IS NULL
  `, [status, userId, id]);
}

async function checkAadhaarUnique(aadhaarNo, excludeId = null) {
  let query = `SELECT id FROM student.student_profiles WHERE aadhaar_no = $1 AND deleted_at IS NULL`;
  const params = [aadhaarNo];
  if (excludeId) { query += ' AND id != $2'; params.push(excludeId); }
  const result = await db.query(query, params);
  return result.rows.length > 0;
}

module.exports = { findAll, findById, create, update, softDelete, softDeleteMultiple, checkAadhaarUnique, updateStatus };
