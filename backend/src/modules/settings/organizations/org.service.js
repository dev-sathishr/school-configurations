const orgRepo = require('./org.repository');
const fileRepo = require('../../files/file.repository');
const { validate } = require('../../../shared/helpers/validate.helper');
const { saveAddresses, getAddresses } = require('../../../shared/helpers/address.helper');

const ORG_RULES = {
  name: { required: true, min: 3, max: 100, label: 'Name' },
  reg_no: { max: 50, label: 'Registration No' },
  email: { max: 100, email: true, label: 'Email' },
  primary_contact_no: { required: true, label: 'Primary Contact' },
  website: { max: 200, label: 'Website' },
  social_facebook: { max: 200, label: 'Facebook' },
  social_instagram: { max: 200, label: 'Instagram' },
  social_twitter: { max: 200, label: 'Twitter' },
  social_linkedin: { max: 200, label: 'LinkedIn' },
  social_youtube: { max: 200, label: 'YouTube' },
  notes: { max: 500, label: 'Notes' },
};

async function getAll(query, viewOwnUserId) {
  return orgRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const org = await orgRepo.findById(id);
  if (!org) return { error: 'notFound', message: 'Organization not found' };

  const [addresses, logo] = await Promise.all([
    getAddresses('organization', id),
    fileRepo.findOneByEntity('organization', id, 'logo'),
  ]);

  return { data: { ...org, addresses, logo: logo || null } };
}

async function create(body, userId) {
  const errors = validate(body, ORG_RULES);
  if (!body.addresses || !Array.isArray(body.addresses) || body.addresses.length === 0) {
    errors.push('At least one address is required');
  }
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Unique checks
  if (body.name) {
    const exists = await orgRepo.checkUnique('name', body.name);
    if (exists) return { error: 'conflict', message: 'Organization name already exists' };
  }
  if (body.email) {
    const exists = await orgRepo.checkUnique('email', body.email);
    if (exists) return { error: 'conflict', message: 'Email already exists' };
  }
  if (body.reg_no) {
    const exists = await orgRepo.checkUnique('reg_no', body.reg_no);
    if (exists) return { error: 'conflict', message: 'Registration number already exists' };
  }

  const org = await orgRepo.create(body, userId);
  await saveAddresses('organization', org.id, body.addresses, userId);

  return { data: org };
}

async function update(id, body, userId) {
  const current = await orgRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Organization not found' };

  const merged = { ...current, ...body };
  const errors = validate(merged, ORG_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Unique checks (exclude self)
  if (body.name && body.name.trim().toLowerCase() !== current.name?.toLowerCase()) {
    const exists = await orgRepo.checkUnique('name', body.name, id);
    if (exists) return { error: 'conflict', message: 'Organization name already exists' };
  }
  if (body.email && body.email.trim().toLowerCase() !== current.email?.toLowerCase()) {
    const exists = await orgRepo.checkUnique('email', body.email, id);
    if (exists) return { error: 'conflict', message: 'Email already exists' };
  }
  if (body.reg_no && body.reg_no.trim().toLowerCase() !== current.reg_no?.toLowerCase()) {
    const exists = await orgRepo.checkUnique('reg_no', body.reg_no, id);
    if (exists) return { error: 'conflict', message: 'Registration number already exists' };
  }

  const org = await orgRepo.update(id, body, current, userId);
  await saveAddresses('organization', id, body.addresses, userId);

  return { data: org };
}

async function remove(id, userId) {
  const current = await orgRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Organization not found' };

  await orgRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await orgRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function getDropdown(query) {
  const page = parseInt(query.page) || 1;
  const size = parseInt(query.size) || 20;
  const search = (query.search || '').trim();
  return orgRepo.findDropdown({ page, size, search });
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, getDropdown };
