const repo = require('./employee-qualifications.repository');
const { validate } = require('../../../../shared/helpers/validate.helper');

const VALID_DEGREES = [
  '10th','12th','diploma','pgdiploma',
  'ba','bsc','bcom','bca','bba','be','btech','bed','bpharm','barch','bsw','blib',
  'ma','msc','mcom','mca','mba','me','mtech','med','mpharm','mphil','msw','mlib',
  'phd','dsc','mbbs','llb','llm','ca','icwa','cs','other',
];

const RULES = {
  degree:          { required: true, max: 50,  label: 'Degree' },
  institution:     { required: true, max: 300, label: 'Institution' },
  field_of_study:  { max: 200, label: 'Field of Study' },
  board_university:{ max: 300, label: 'Board / University' },
  grade:           { max: 50,  label: 'Grade / Percentage' },
  notes:           { max: 500, label: 'Notes' },
};

function validateDegree(body) {
  if (body.degree && !VALID_DEGREES.includes(body.degree)) {
    return ['Invalid degree value'];
  }
  return [];
}

function validateYear(body) {
  if (body.year_of_passing != null && body.year_of_passing !== '') {
    const y = Number(body.year_of_passing);
    if (!Number.isInteger(y) || y < 1950 || y > new Date().getFullYear()) {
      return ['Year of passing must be between 1950 and current year'];
    }
  }
  return [];
}

async function getAll(employeeId) {
  const rows = await repo.findAllByEmployee(employeeId);
  return { data: rows };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) return { error: 'notFound', message: 'Qualification not found' };
  return { data: row };
}

async function create(employeeId, body, userId) {
  const errors = [
    ...validate(body, RULES),
    ...validateDegree(body),
    ...validateYear(body),
  ];
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const row = await repo.create(employeeId, body, userId);
  return getById(row.id);
}

async function update(id, body, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Qualification not found' };

  const errors = [
    ...validate(body, RULES),
    ...validateDegree(body),
    ...validateYear(body),
  ];
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const row = await repo.update(id, body, userId);
  if (!row) return { error: 'notFound', message: 'Qualification not found' };
  return getById(id);
}

async function remove(id, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Qualification not found' };
  await repo.softDelete(id, userId);
  return {};
}

module.exports = { getAll, getById, create, update, remove };
