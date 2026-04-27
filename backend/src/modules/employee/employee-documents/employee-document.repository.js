const db = require('../../../config/database');

const TABLE = 'settings.employee_documents';

const SELECT_FIELDS = `
  d.id, d.employee_id, d.document_type_id, d.document_no,
  d.expiry_date, d.notes,
  d.created_at, d.updated_at,
  dt.name   AS document_type_name,
  dt.code   AS document_type_code,
  dt.category AS document_type_category,
  f.id        AS file_id,
  f.original_name AS file_name,
  f.mime_type AS file_mime_type,
  f.size      AS file_size,
  f.path      AS file_path
`;

const JOINS = `
  JOIN settings.document_types dt ON d.document_type_id = dt.id AND dt.deleted_at IS NULL
  LEFT JOIN settings.files f
    ON f.entity_type = 'employee_document'
   AND f.entity_id   = d.id
   AND f.deleted_at IS NULL
`;

async function findAllByEmployee(employeeId) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS}
     FROM ${TABLE} d
     ${JOINS}
     WHERE d.employee_id = $1 AND d.deleted_at IS NULL
     ORDER BY dt.category, dt.name, d.created_at DESC`,
    [employeeId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS}
     FROM ${TABLE} d
     ${JOINS}
     WHERE d.id = $1 AND d.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(employeeId, data, userId) {
  const result = await db.query(
    `INSERT INTO ${TABLE}
       (employee_id, document_type_id, document_no, expiry_date, notes, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id`,
    [
      employeeId,
      data.document_type_id,
      data.document_no  || null,
      data.expiry_date  || null,
      data.notes        || null,
      userId,
    ]
  );
  return result.rows[0];
}

async function update(id, data, userId) {
  const result = await db.query(
    `UPDATE ${TABLE} SET
       document_type_id=$1, document_no=$2, expiry_date=$3,
       notes=$4, updated_by=$5, updated_at=NOW()
     WHERE id=$6 AND deleted_at IS NULL RETURNING id`,
    [
      data.document_type_id,
      data.document_no  || null,
      data.expiry_date  || null,
      data.notes        || null,
      userId,
      id,
    ]
  );
  return result.rows[0] || null;
}

async function softDelete(id, userId) {
  await db.query(
    `UPDATE ${TABLE} SET deleted_at=NOW(), deleted_by=$1 WHERE id=$2`,
    [userId, id]
  );
}

module.exports = { findAllByEmployee, findById, create, update, softDelete };
