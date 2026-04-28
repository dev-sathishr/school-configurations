const repo = require('./relation.repository');
const { saveAddresses, getAddresses } = require('../../../../shared/helpers/address.helper');

const VALID_RELATION_TYPES = [
  'father','mother','spouse','son','daughter',
  'brother','sister','guardian','legal_guardian',
  'grandfather','grandmother','grandson','granddaughter',
  'uncle','aunt','nephew','niece',
  'stepfather','stepmother','stepson','stepdaughter',
  'father_in_law','mother_in_law','other',
];

function validate(body) {
  const errors = [];
  if (!body.name || String(body.name).trim().length < 2) errors.push('Name must be at least 2 characters');
  if (body.name && String(body.name).trim().length > 200) errors.push('Name must be at most 200 characters');
  if (!body.relation_type) errors.push('Relation type is required');
  if (body.relation_type && !VALID_RELATION_TYPES.includes(body.relation_type)) errors.push('Invalid relation type');
  if (body.aadhaar_no && !/^\d{12}$/.test(String(body.aadhaar_no).trim())) errors.push('Aadhaar number must be exactly 12 digits');
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('Invalid email address');
  if (body.contact_no && String(body.contact_no).trim().length > 20) errors.push('Contact number must be at most 20 characters');
  if (body.occupation && String(body.occupation).trim().length > 200) errors.push('Occupation must be at most 200 characters');
  if (body.notes && String(body.notes).trim().length > 500) errors.push('Notes must be at most 500 characters');
  if (body.annual_income && isNaN(Number(body.annual_income))) errors.push('Annual income must be a number');
  return errors;
}

async function getAll(employeeId) {
  const rows = await repo.findAllByEmployee(employeeId);
  return { data: rows };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) return { error: 'notFound', message: 'Relation record not found' };
  const addresses = await getAddresses('relation', row.relation_id);
  return { data: { ...row, addresses } };
}

async function create(employeeId, body, userId) {
  const errors = validate(body);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.relation_type !== 'other') {
    const existing = await repo.findByType(employeeId, body.relation_type);
    if (existing) return { error: 'conflict', message: `A ${body.relation_type.replace(/_/g, ' ')} relation already exists for this employee` };
  }

  const row = await repo.create(employeeId, body, userId);

  if (body.addresses?.length) {
    await saveAddresses('relation', row.relation_id, body.addresses, userId);
  }

  return getById(row.id);
}

async function update(id, body, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Relation record not found' };

  const errors = validate(body);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.relation_type !== 'other') {
    const duplicate = await repo.findByType(existing.entity_id, body.relation_type, id);
    if (duplicate) return { error: 'conflict', message: `A ${body.relation_type.replace(/_/g, ' ')} relation already exists for this employee` };
  }

  const row = await repo.update(id, body, userId);
  if (!row) return { error: 'notFound', message: 'Relation record not found' };

  if (body.addresses?.length) {
    await saveAddresses('relation', existing.relation_id, body.addresses, userId);
  }

  return getById(id);
}

async function remove(id, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Relation record not found' };
  await repo.softDelete(id, userId);
  return {};
}

module.exports = { getAll, getById, create, update, remove };
