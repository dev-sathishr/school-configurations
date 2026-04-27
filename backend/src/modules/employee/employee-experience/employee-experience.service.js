const repo = require('./employee-experience.repository');
const { validate } = require('../../../shared/helpers/validate.helper');

const RULES = {
  organization: { required: true, max: 300, label: 'Organization' },
  designation:  { max: 200, label: 'Designation / Role' },
  notes:        { max: 500, label: 'Notes' },
};

function validateDates(body) {
  const errors = [];
  if (!body.from_date) {
    errors.push('From Date is required');
  }
  if (body.to_date && body.from_date && body.to_date <= body.from_date) {
    errors.push('To Date must be after From Date');
  }
  if (body.is_current && body.to_date) {
    errors.push('To Date should be empty when marking as current employment');
  }
  return errors;
}

async function getAll(employeeId) {
  const rows = await repo.findAllByEmployee(employeeId);
  return { data: rows };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) return { error: 'notFound', message: 'Experience record not found' };
  return { data: row };
}

async function create(employeeId, body, userId) {
  const errors = [
    ...validate(body, RULES),
    ...validateDates(body),
  ];
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const row = await repo.create(employeeId, body, userId);
  return getById(row.id);
}

async function update(id, body, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Experience record not found' };

  const errors = [
    ...validate(body, RULES),
    ...validateDates(body),
  ];
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const row = await repo.update(id, body, userId);
  if (!row) return { error: 'notFound', message: 'Experience record not found' };
  return getById(id);
}

async function remove(id, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Experience record not found' };
  await repo.softDelete(id, userId);
  return {};
}

module.exports = { getAll, getById, create, update, remove };
