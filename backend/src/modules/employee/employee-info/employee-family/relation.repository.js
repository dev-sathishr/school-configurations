const db = require('../../../../config/database');

const ENTITY_TYPE    = 'employee';
const MAPPING_TABLE  = 'settings.relation_mappings';
const RELATION_TABLE = 'settings.relations';

const SELECT_FIELDS = `
  m.id,
  m.entity_id,
  m.entity_type,
  m.relation_id,
  m.relation_type,
  m.is_emergency_contact,
  m.created_at,
  m.updated_at,
  r.name,
  r.dob,
  r.gender,
  r.aadhaar_no,
  r.contact_code,
  r.contact_no,
  r.email,
  r.occupation,
  r.qualification,
  r.annual_income,
  r.notes
`;

const JOINS = `
  JOIN ${RELATION_TABLE} r ON r.id = m.relation_id AND r.deleted_at IS NULL
`;

async function findAllByEmployee(employeeId) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS}
     FROM ${MAPPING_TABLE} m
     ${JOINS}
     WHERE m.entity_type = $1 AND m.entity_id = $2 AND m.deleted_at IS NULL
     ORDER BY m.created_at ASC`,
    [ENTITY_TYPE, employeeId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS}
     FROM ${MAPPING_TABLE} m
     ${JOINS}
     WHERE m.id = $1 AND m.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function findByType(employeeId, relationType, excludeId) {
  const params = [ENTITY_TYPE, employeeId, relationType];
  let sql = `SELECT m.id FROM ${MAPPING_TABLE} m
             WHERE m.entity_type = $1 AND m.entity_id = $2
               AND m.relation_type = $3 AND m.deleted_at IS NULL`;
  if (excludeId) {
    sql += ` AND m.id != $4`;
    params.push(excludeId);
  }
  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function create(employeeId, data, userId) {
  const rel = await db.query(
    `INSERT INTO ${RELATION_TABLE}
       (name, dob, gender, aadhaar_no, contact_code, contact_no,
        email, occupation, qualification, annual_income, notes,
        created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12) RETURNING id`,
    [
      data.name,
      data.dob           || null,
      data.gender        || null,
      data.aadhaar_no    || null,
      data.contact_code  || '+91',
      data.contact_no    || null,
      data.email         || null,
      data.occupation    || null,
      data.qualification || null,
      data.annual_income || null,
      data.notes         || null,
      userId,
    ]
  );

  const mapping = await db.query(
    `INSERT INTO ${MAPPING_TABLE}
       (relation_id, entity_type, entity_id, relation_type, is_emergency_contact, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id, relation_id`,
    [
      rel.rows[0].id,
      ENTITY_TYPE,
      employeeId,
      data.relation_type,
      data.is_emergency_contact || false,
      userId,
    ]
  );

  return mapping.rows[0];
}

async function update(id, data, userId) {
  const existing = await db.query(
    `SELECT relation_id FROM ${MAPPING_TABLE} WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (!existing.rows[0]) return null;

  const relationId = existing.rows[0].relation_id;

  await db.query(
    `UPDATE ${RELATION_TABLE} SET
       name=$1, dob=$2, gender=$3, aadhaar_no=$4,
       contact_code=$5, contact_no=$6, email=$7,
       occupation=$8, qualification=$9, annual_income=$10,
       notes=$11, updated_by=$12, updated_at=NOW()
     WHERE id=$13 AND deleted_at IS NULL`,
    [
      data.name,
      data.dob           || null,
      data.gender        || null,
      data.aadhaar_no    || null,
      data.contact_code  || '+91',
      data.contact_no    || null,
      data.email         || null,
      data.occupation    || null,
      data.qualification || null,
      data.annual_income || null,
      data.notes         || null,
      userId,
      relationId,
    ]
  );

  await db.query(
    `UPDATE ${MAPPING_TABLE} SET
       relation_type=$1, is_emergency_contact=$2,
       updated_by=$3, updated_at=NOW()
     WHERE id=$4 AND deleted_at IS NULL`,
    [data.relation_type, data.is_emergency_contact || false, userId, id]
  );

  return { id };
}

async function softDelete(id, userId) {
  const existing = await db.query(
    `SELECT relation_id FROM ${MAPPING_TABLE} WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (!existing.rows[0]) return;

  const relationId = existing.rows[0].relation_id;

  await db.query(
    `UPDATE ${MAPPING_TABLE} SET deleted_at=NOW(), deleted_by=$1 WHERE id=$2`,
    [userId, id]
  );
  await db.query(
    `UPDATE ${RELATION_TABLE} SET deleted_at=NOW(), deleted_by=$1 WHERE id=$2`,
    [userId, relationId]
  );
}

module.exports = { findAllByEmployee, findById, findByType, create, update, softDelete };
