const db = require('../../../config/database');

const TABLE = 'settings.employee_experience';

const SELECT_FIELDS = `
  e.id, e.employee_id, e.organization, e.designation,
  e.from_date, e.to_date, e.is_current, e.notes,
  e.created_at, e.updated_at
`;

async function findAllByEmployee(employeeId) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS} FROM ${TABLE} e
     WHERE e.employee_id = $1 AND e.deleted_at IS NULL
     ORDER BY e.is_current DESC, e.from_date DESC`,
    [employeeId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS} FROM ${TABLE} e
     WHERE e.id = $1 AND e.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(employeeId, data, userId) {
  const result = await db.query(
    `INSERT INTO ${TABLE}
       (employee_id, organization, designation, from_date, to_date, is_current, notes, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id`,
    [
      employeeId,
      data.organization,
      data.designation || null,
      data.from_date,
      data.to_date     || null,
      data.is_current  ?? false,
      data.notes       || null,
      userId,
    ]
  );
  return result.rows[0];
}

async function update(id, data, userId) {
  const result = await db.query(
    `UPDATE ${TABLE} SET
       organization=$1, designation=$2, from_date=$3, to_date=$4,
       is_current=$5, notes=$6, updated_by=$7, updated_at=NOW()
     WHERE id=$8 AND deleted_at IS NULL RETURNING id`,
    [
      data.organization,
      data.designation || null,
      data.from_date,
      data.to_date     || null,
      data.is_current  ?? false,
      data.notes       || null,
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
