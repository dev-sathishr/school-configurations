const payrollRepo = require('./employee-payroll.repository');
const { validate } = require('../../../shared/helpers/validate.helper');

const WAGE_TYPES = ['monthly', 'daily', 'hourly'];

const PAYROLL_RULES = {
  joining_date:     { required: true, label: 'Joining Date' },
  relieving_reason: { max: 200, label: 'Relieving Reason' },
  biometric_id:     { max: 50,  label: 'Biometric ID' },
  epf_uan_no:       { max: 12,  label: 'EPF UAN No' },
  pf_no:            { max: 22,  label: 'PF No' },
  esi_no:           { max: 17,  label: 'ESI No' },
  pan_no:           { max: 10,  label: 'PAN No' },
  notes:            { max: 500, label: 'Notes' },
};

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const DIGITS_PATTERN = /^\d+$/;

function validateStatutory(body) {
  const errors = [];
  if (body.epf_uan_no && (!DIGITS_PATTERN.test(body.epf_uan_no) || body.epf_uan_no.length !== 12)) {
    errors.push('EPF UAN No must be exactly 12 digits');
  }
  if (body.esi_no && (!DIGITS_PATTERN.test(body.esi_no) || body.esi_no.length !== 17)) {
    errors.push('ESI No must be exactly 17 digits');
  }
  if (body.pan_no && !PAN_PATTERN.test(body.pan_no)) {
    errors.push('PAN No must be in format ABCDE1234F');
  }
  if (body.basic_salary != null && (isNaN(body.basic_salary) || body.basic_salary < 0)) {
    errors.push('Basic Salary must be a positive number');
  }
  if (body.day_wages != null && (isNaN(body.day_wages) || body.day_wages < 0)) {
    errors.push('Day Wages must be a positive number');
  }
  return errors;
}

function validateWageType(body) {
  if (body.wage_type && !WAGE_TYPES.includes(body.wage_type)) {
    return [`wage_type must be one of: ${WAGE_TYPES.join(', ')}`];
  }
  return [];
}

function validateDates(body) {
  const errors = [];
  if (body.relieving_date && body.joining_date && body.relieving_date <= body.joining_date) {
    errors.push('Relieving date must be after joining date');
  }
  if (body.probation_end_date && body.joining_date && body.probation_end_date < body.joining_date) {
    errors.push('Probation end date cannot be before joining date');
  }
  return errors;
}

async function getAllByEmployee(employeeId) {
  const rows = await payrollRepo.findAllByEmployee(employeeId);
  return { data: rows };
}

async function getById(id) {
  const record = await payrollRepo.findById(id);
  if (!record) return { error: 'notFound', message: 'Payroll record not found' };
  return { data: record };
}

async function create(employeeId, body, userId) {
  const payload = { ...body, employee_id: employeeId };

  const errors = [
    ...validate(payload, PAYROLL_RULES),
    ...validateWageType(payload),
    ...validateDates(payload),
    ...validateStatutory(payload),
  ];
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // If marking as current, clear the flag on all other periods first
  if (payload.is_current !== false) {
    await payrollRepo.clearCurrentFlag(employeeId);
  }

  const record = await payrollRepo.create(payload, userId);
  return getById(record.id);
}

async function update(id, body, userId) {
  const existing = await payrollRepo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Payroll record not found' };

  const payload = { ...body };
  const errors = [
    ...validate(payload, PAYROLL_RULES),
    ...validateWageType(payload),
    ...validateDates(payload),
    ...validateStatutory(payload),
  ];
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // If marking this one as current, clear flag on siblings
  if (payload.is_current === true && !existing.is_current) {
    await payrollRepo.clearCurrentFlag(existing.employee_id, id);
  }

  const updated = await payrollRepo.update(id, payload, userId);
  if (!updated) return { error: 'notFound', message: 'Payroll record not found' };
  return getById(id);
}

async function remove(id, userId) {
  const existing = await payrollRepo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Payroll record not found' };

  // Don't allow deleting the current active period if others exist
  if (existing.is_current) {
    const all = await payrollRepo.findAllByEmployee(existing.employee_id);
    if (all.length > 1) {
      return { error: 'conflict', message: 'Cannot delete the current payroll period. Set another period as current first.' };
    }
  }

  await payrollRepo.softDelete(id, userId);
  return {};
}

// Called when adding a new joining period after a resignation
async function addRejoinPeriod(employeeId, body, userId) {
  // Auto-mark previous current as not current
  await payrollRepo.clearCurrentFlag(employeeId);
  const payload = { ...body, employee_id: employeeId, is_current: true };

  const errors = [
    ...validate(payload, PAYROLL_RULES),
    ...validateWageType(payload),
    ...validateDates(payload),
    ...validateStatutory(payload),
  ];
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const record = await payrollRepo.create(payload, userId);
  return getById(record.id);
}

module.exports = { getAllByEmployee, getById, create, update, remove, addRejoinPeriod };
