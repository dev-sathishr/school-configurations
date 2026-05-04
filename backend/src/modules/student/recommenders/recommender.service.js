const recommenderRepo = require('./recommender.repository');
const { validate } = require('../../../shared/helpers/validate.helper');

const VALID_CATEGORIES = ['management', 'vip', 'parent', 'staff', 'other'];

const RECOMMENDER_RULES = {
  name:        { required: true, min: 3, max: 100, label: 'Name' },
  category:    { required: true,                   label: 'Category' },
  contact_no:  { required: true, min: 7, max: 15,  label: 'Contact Number' },
  email:       { max: 100, email: true,             label: 'Email' },
  occupation:  { max: 100,                          label: 'Occupation' },
  notes:       { max: 500,                          label: 'Notes' },
};

function normalizeBody(body = {}) {
  return {
    ...body,
    name:       String(body.name || '').trim(),
    contact_no: String(body.contact_no || '').trim(),
    email:      body.email ? String(body.email).trim() : null,
  };
}

async function getAll(query) {
  return recommenderRepo.findAll(query);
}

async function getById(id) {
  const rec = await recommenderRepo.findById(id);
  if (!rec) return { error: 'notFound', message: 'Recommender not found' };
  return { data: rec };
}

async function getDropdown(query) {
  const data = await recommenderRepo.getDropdown(query);
  return { data };
}

async function create(body, userId) {
  const normalized = normalizeBody(body);
  const errors = validate(normalized, RECOMMENDER_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (!VALID_CATEGORIES.includes(normalized.category)) {
    return { error: 'badRequest', message: 'Invalid category' };
  }

  if (!Array.isArray(normalized.addresses) || normalized.addresses.length === 0) {
    return { error: 'badRequest', message: 'At least one address is required' };
  }

  const dup = await recommenderRepo.checkUnique(normalized.contact_no);
  if (dup) return { error: 'conflict', message: 'A recommender with this contact number already exists' };

  const id = await recommenderRepo.create(normalized, userId);
  const created = await recommenderRepo.findById(id);
  return { data: created };
}

async function update(id, body, userId) {
  const normalized = normalizeBody(body);
  const errors = validate(normalized, RECOMMENDER_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (!VALID_CATEGORIES.includes(normalized.category)) {
    return { error: 'badRequest', message: 'Invalid category' };
  }

  const existing = await recommenderRepo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Recommender not found' };

  if (!Array.isArray(normalized.addresses) || normalized.addresses.length === 0) {
    return { error: 'badRequest', message: 'At least one address is required' };
  }

  const dup = await recommenderRepo.checkUnique(normalized.contact_no, id);
  if (dup) return { error: 'conflict', message: 'A recommender with this contact number already exists' };

  await recommenderRepo.update(id, normalized, userId);
  const updated = await recommenderRepo.findById(id);
  return { data: updated };
}

async function remove(id, userId) {
  const existing = await recommenderRepo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Recommender not found' };
  await recommenderRepo.softDelete(id, userId);
  return { data: null };
}

async function removeMultiple(ids, userId) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'No IDs provided' };
  }
  await recommenderRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: ids.length };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
