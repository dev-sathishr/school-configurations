const db = require('../../../../config/database');
const { paginate } = require('../../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../../shared/helpers/repo.helper');
const { applyLocationScope, scopedFindByIdClause } = require('../../../../shared/helpers/location-scope.helper');

const TABLE = 'employee.employee_info';

const SELECT_FIELDS = `
  e.id, e.location_id, e.designation_id,
  e.employee_name, e.display_name, e.employee_code,
  e.gender, e.dob, e.blood_group, e.marital_status, e.religion, e.community,
  e.aadhaar_no,
  e.primary_contact_code, e.primary_contact_no,
  e.secondary_contact_code, e.secondary_contact_no,
  e.email, e.is_active, e.notes,
  e.created_by, e.updated_by, e.created_at, e.updated_at,
  l.name AS location_name, l.code AS location_code,
  d.name AS designation_name, d.code AS designation_code,
  eg.name AS employee_group_name, eg.code AS employee_group_code,
  ec.name AS employee_category_name, ec.code AS employee_category_code,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name,
  ep.id AS photo_file_id
`;

const JOINS = `
  LEFT JOIN settings.locations l ON e.location_id = l.id AND l.deleted_at IS NULL
  LEFT JOIN employee.designations d ON e.designation_id = d.id AND d.deleted_at IS NULL
  LEFT JOIN employee.employee_groups eg ON d.employee_group_id = eg.id AND eg.deleted_at IS NULL
  LEFT JOIN employee.employee_categories ec ON eg.employee_category_id = ec.id AND ec.deleted_at IS NULL
  LEFT JOIN settings.users cb ON e.created_by = cb.id
  LEFT JOIN settings.users ub ON e.updated_by = ub.id
  LEFT JOIN LATERAL (SELECT f.id FROM settings.files f WHERE f.entity_type = 'employee' AND f.entity_id = e.id AND f.file_type = 'photo' AND f.deleted_at IS NULL ORDER BY f.created_at DESC LIMIT 1) ep ON true
`;

async function findAll(query, scope) {
  const clauses = [];
  const params = [];

  const loc = applyLocationScope({ column: 'e.location_id', scope, requested: query.location_ids });
  if (loc.empty) return { data: [], pagination: { page: 1, size: 10, total_count: 0, total_pages: 0 } };
  if (loc.clause) { clauses.push(loc.clause); params.push(...loc.params); }

  return paginate({
    table: TABLE,
    alias: 'e',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['e.employee_name', 'e.display_name', 'e.employee_code', 'e.email', 'e.primary_contact_no', 'd.name', 'l.name'],
    filterableColumns: ['e.employee_code', 'e.gender', 'e.is_active', 'e.location_id', 'e.designation_id', 'e.blood_group', 'e.marital_status'],
    sortableColumns: ['e.employee_name', 'e.employee_code', 'e.is_active', 'e.created_at', 'd.name', 'l.name'],
    defaultSortBy: 'e.created_at',
    defaultSortOrder: 'DESC',
    extraWhere: clauses.join(' AND '),
    extraWhereParams: params,
  }, query);
}

async function findById(id, scope) {
  const s = scopedFindByIdClause(scope, 'e.location_id', 2);
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM ${TABLE} e
    ${JOINS}
    WHERE e.id = $1 AND e.deleted_at IS NULL ${s.clause}
  `, [id, ...s.params]);
  return result.rows[0] || null;
}

async function findByCodeAndLocation(code, locationId, excludeId = null) {
  let query = `SELECT id FROM ${TABLE} WHERE LOWER(employee_code) = LOWER($1) AND location_id = $2 AND deleted_at IS NULL`;
  const params = [code, locationId];
  if (excludeId) {
    query += ' AND id != $3';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows[0] || null;
}

async function getDropdown(query, scope) {
  const clauses = ['e.is_active = true'];
  const params = [];

  const loc = applyLocationScope({ column: 'e.location_id', scope, requested: query.location_ids });
  if (loc.empty) return { data: [], pagination: { page: 1, size: 20, total_count: 0, total_pages: 0 } };
  if (loc.clause) { clauses.push(loc.clause); params.push(...loc.params); }

  return paginate({
    table: TABLE,
    alias: 'e',
    selectFields: 'e.id, e.employee_name, e.display_name, e.employee_code, e.location_id',
    joins: '',
    searchColumns: ['e.employee_name', 'e.display_name', 'e.employee_code'],
    filterableColumns: [],
    sortableColumns: ['e.employee_name', 'e.employee_code'],
    defaultSortBy: 'e.employee_name',
    defaultSortOrder: 'ASC',
    extraWhere: clauses.join(' AND '),
    extraWhereParams: params,
  }, query);
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO ${TABLE} (
      location_id, designation_id,
      employee_name, display_name, employee_code,
      gender, dob, blood_group, marital_status, religion, community, aadhaar_no,
      primary_contact_code, primary_contact_no,
      secondary_contact_code, secondary_contact_no,
      email, is_active, notes,
      created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING id
  `, [
    data.location_id,
    data.designation_id || null,
    data.employee_name,
    data.display_name || null,
    data.employee_code,
    data.gender || null,
    data.dob || null,
    data.blood_group || null,
    data.marital_status || null,
    data.religion || null,
    data.community || null,
    data.aadhaar_no || null,
    data.primary_contact_code || '+91',
    data.primary_contact_no || null,
    data.secondary_contact_code || '+91',
    data.secondary_contact_no || null,
    data.email || null,
    data.is_active !== undefined ? data.is_active : true,
    data.notes || null,
    userId,
    userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const result = await db.query(`
    UPDATE ${TABLE} SET
      location_id = $1, designation_id = $2,
      employee_name = $3, display_name = $4, employee_code = $5,
      gender = $6, dob = $7, blood_group = $8, marital_status = $9,
      religion = $10, community = $11, aadhaar_no = $12,
      primary_contact_code = $13, primary_contact_no = $14,
      secondary_contact_code = $15, secondary_contact_no = $16,
      email = $17, is_active = $18, notes = $19,
      updated_by = $20, updated_at = NOW()
    WHERE id = $21
      AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $22::timestamptz)
    RETURNING id, updated_at
  `, [
    data.location_id || current.location_id,
    data.designation_id !== undefined ? data.designation_id : current.designation_id,
    data.employee_name || current.employee_name,
    data.display_name !== undefined ? (data.display_name || null) : current.display_name,
    data.employee_code || current.employee_code,
    data.gender !== undefined ? (data.gender || null) : current.gender,
    data.dob !== undefined ? (data.dob || null) : current.dob,
    data.blood_group !== undefined ? (data.blood_group || null) : current.blood_group,
    data.marital_status !== undefined ? (data.marital_status || null) : current.marital_status,
    data.religion !== undefined ? (data.religion || null) : current.religion,
    data.community !== undefined ? (data.community || null) : current.community,
    data.aadhaar_no !== undefined ? (data.aadhaar_no || null) : current.aadhaar_no,
    data.primary_contact_code || current.primary_contact_code,
    data.primary_contact_no !== undefined ? (data.primary_contact_no || null) : current.primary_contact_no,
    data.secondary_contact_code || current.secondary_contact_code,
    data.secondary_contact_no !== undefined ? (data.secondary_contact_no || null) : current.secondary_contact_no,
    data.email !== undefined ? (data.email || null) : current.email,
    data.is_active !== undefined ? data.is_active : current.is_active,
    data.notes !== undefined ? (data.notes || null) : current.notes,
    userId,
    id,
    expectedUpdatedAt,
  ]);
  return result.rows[0] || null;
}

async function checkUniqueField(field, value, excludeId = null) {
  const allowed = ['aadhaar_no', 'email', 'primary_contact_no', 'secondary_contact_no'];
  if (!allowed.includes(field)) throw new Error('Invalid field');

  // Phone numbers must be unique across BOTH contact columns, not just the one being saved.
  const phoneFields = ['primary_contact_no', 'secondary_contact_no'];
  const isPhone = phoneFields.includes(field);
  const whereValue = isPhone
    ? `(LOWER(primary_contact_no) = LOWER($1) OR LOWER(secondary_contact_no) = LOWER($1))`
    : `LOWER(${field}) = LOWER($1)`;

  let query = `SELECT id FROM ${TABLE} WHERE ${whereValue} AND deleted_at IS NULL`;
  const params = [value];
  if (excludeId) { query += ' AND id != $2'; params.push(excludeId); }
  const result = await db.query(query, params);
  return result.rows[0] || null;
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId, scope) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId, scopeColumn: 'location_id', scope });
}

// Returns active employees not yet linked to any user account.
// Used in the user form person picker when person_type = 'employee'.
// If excludeUserId is provided (edit mode), the employee linked to that user is included.
async function getLinkableDropdown({ page = 1, size = 20, search = '', excludeUserId = null } = {}) {
  const offset = (page - 1) * size;
  const params = [];
  let where = `WHERE e.is_active = true AND e.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM settings.users u
      WHERE u.person_id = e.id AND u.deleted_at IS NULL
      ${excludeUserId ? `AND u.id != $${params.push(excludeUserId) && params.length}` : ''}
    )`;

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (e.employee_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length})`;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) FROM ${TABLE} e ${where}`, params
  );
  const totalCount = parseInt(countResult.rows[0].count);

  params.push(size, offset);
  const result = await db.query(
    `SELECT e.id, e.employee_name AS name, e.employee_code AS code,
            e.email, e.primary_contact_code AS phone_code, e.primary_contact_no AS phone
     FROM ${TABLE} e ${where}
     ORDER BY e.employee_name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data: result.rows.map(r => ({
      id: r.id,
      name: r.code ? `${r.name} (${r.code})` : r.name,
      email: r.email || '',
      phone_code: r.phone_code || '+91',
      phone: r.phone || '',
    })),
    pagination: { page, size, total_count: totalCount, total_pages: Math.ceil(totalCount / size) },
  };
}

module.exports = {
  findAll,
  findById,
  findByCodeAndLocation,
  checkUniqueField,
  getDropdown,
  getLinkableDropdown,
  create,
  update,
  softDelete,
  softDeleteMultiple,
};
