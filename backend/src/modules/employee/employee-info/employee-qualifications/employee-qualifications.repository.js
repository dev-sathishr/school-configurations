const db = require('../../../../config/database');

const TABLE = 'employee.employee_qualifications';

const SELECT_FIELDS = `
  q.id, q.employee_id, q.degree, q.field_of_study, q.institution,
  q.board_university, q.year_of_passing, q.grade, q.notes,
  q.created_at, q.updated_at
`;

async function findAllByEmployee(employeeId) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS} FROM ${TABLE} q
     WHERE q.employee_id = $1 AND q.deleted_at IS NULL
     ORDER BY q.year_of_passing DESC NULLS LAST, q.created_at DESC`,
    [employeeId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS} FROM ${TABLE} q
     WHERE q.id = $1 AND q.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(employeeId, data, userId) {
  const result = await db.query(
    `INSERT INTO ${TABLE}
       (employee_id, degree, field_of_study, institution, board_university,
        year_of_passing, grade, notes, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING id`,
    [
      employeeId,
      data.degree,
      data.field_of_study   || null,
      data.institution,
      data.board_university || null,
      data.year_of_passing  || null,
      data.grade            || null,
      data.notes            || null,
      userId,
    ]
  );
  return result.rows[0];
}

async function update(id, data, userId) {
  const result = await db.query(
    `UPDATE ${TABLE} SET
       degree=$1, field_of_study=$2, institution=$3, board_university=$4,
       year_of_passing=$5, grade=$6, notes=$7, updated_by=$8, updated_at=NOW()
     WHERE id=$9 AND deleted_at IS NULL RETURNING id`,
    [
      data.degree,
      data.field_of_study   || null,
      data.institution,
      data.board_university || null,
      data.year_of_passing  || null,
      data.grade            || null,
      data.notes            || null,
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
