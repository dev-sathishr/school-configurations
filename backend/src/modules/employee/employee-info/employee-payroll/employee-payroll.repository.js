const db = require('../../../../config/database');
const repoHelper = require('../../../../shared/helpers/repo.helper');

const TABLE = 'employee.employee_payroll';

const SELECT_FIELDS = `
  ep.id, ep.employee_id, ep.joining_date, ep.relieving_date, ep.relieving_reason,
  ep.probation_end_date, ep.wage_type, ep.basic_salary, ep.day_wages,
  ep.biometric_id, ep.epf_applicable, ep.epf_uan_no, ep.pf_no,
  ep.esi_applicable, ep.esi_no, ep.pan_no,
  ep.is_current, ep.notes,
  ep.created_by, ep.updated_by, ep.created_at, ep.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `
  LEFT JOIN settings.users cb ON ep.created_by = cb.id
  LEFT JOIN settings.users ub ON ep.updated_by = ub.id`;

async function findAllByEmployee(employeeId) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS}
     FROM ${TABLE} ep ${JOINS}
     WHERE ep.employee_id = $1 AND ep.deleted_at IS NULL
     ORDER BY ep.joining_date DESC`,
    [employeeId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS}
     FROM ${TABLE} ep ${JOINS}
     WHERE ep.id = $1 AND ep.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function findCurrentByEmployee(employeeId) {
  const result = await db.query(
    `SELECT ${SELECT_FIELDS}
     FROM ${TABLE} ep ${JOINS}
     WHERE ep.employee_id = $1 AND ep.is_current = true AND ep.deleted_at IS NULL`,
    [employeeId]
  );
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(
    `INSERT INTO ${TABLE} (
      employee_id, joining_date, relieving_date, relieving_reason, probation_end_date,
      wage_type, basic_salary, day_wages, biometric_id,
      epf_applicable, epf_uan_no, pf_no,
      esi_applicable, esi_no, pan_no,
      is_current, notes, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)
    RETURNING id`,
    [
      data.employee_id, data.joining_date,
      data.relieving_date || null, data.relieving_reason || null,
      data.probation_end_date || null,
      data.wage_type || 'monthly',
      data.basic_salary || null, data.day_wages || null,
      data.biometric_id || null,
      data.epf_applicable || false, data.epf_uan_no || null, data.pf_no || null,
      data.esi_applicable || false, data.esi_no || null,
      data.pan_no || null,
      data.is_current !== undefined ? data.is_current : true,
      data.notes || null, userId,
    ]
  );
  return result.rows[0];
}

async function update(id, data, userId) {
  const result = await db.query(
    `UPDATE ${TABLE} SET
      joining_date = $1, relieving_date = $2, relieving_reason = $3,
      probation_end_date = $4, wage_type = $5, basic_salary = $6, day_wages = $7,
      biometric_id = $8, epf_applicable = $9, epf_uan_no = $10, pf_no = $11,
      esi_applicable = $12, esi_no = $13, pan_no = $14,
      is_current = $15, notes = $16,
      updated_by = $17, updated_at = NOW()
    WHERE id = $18 AND deleted_at IS NULL
    RETURNING id`,
    [
      data.joining_date,
      data.relieving_date || null, data.relieving_reason || null,
      data.probation_end_date || null,
      data.wage_type || 'monthly',
      data.basic_salary || null, data.day_wages || null,
      data.biometric_id || null,
      data.epf_applicable || false, data.epf_uan_no || null, data.pf_no || null,
      data.esi_applicable || false, data.esi_no || null,
      data.pan_no || null,
      data.is_current !== undefined ? data.is_current : true,
      data.notes || null, userId, id,
    ]
  );
  return result.rows[0] || null;
}

async function clearCurrentFlag(employeeId, exceptId = null) {
  let q = `UPDATE ${TABLE} SET is_current = false WHERE employee_id = $1 AND deleted_at IS NULL`;
  const params = [employeeId];
  if (exceptId) { q += ` AND id != $2`; params.push(exceptId); }
  await db.query(q, params);
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

module.exports = {
  findAllByEmployee, findById, findCurrentByEmployee,
  create, update, clearCurrentFlag, softDelete,
};
