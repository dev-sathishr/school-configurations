const documentTypeRepo = require('./document-type.repository');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

const VALID_CATEGORIES = ['KYC', 'EDUCATIONAL', 'EMPLOYMENT', 'STATUTORY', 'MEDICAL', 'OTHER'];

async function getAll(query) {
  return documentTypeRepo.findAll(query);
}

async function getById(id) {
  const record = await documentTypeRepo.findById(id);
  if (!record) return { error: 'notFound', message: 'Document type not found' };
  return { data: record };
}

async function getDropdown(query) {
  return documentTypeRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code, category } = body;
  if (!name || !name.trim()) return { error: 'badRequest', message: 'Name is required' };
  if (!code || !code.trim()) return { error: 'badRequest', message: 'Code is required' };
  if (!category) return { error: 'badRequest', message: 'Category is required' };
  if (!VALID_CATEGORIES.includes(category)) {
    return { error: 'badRequest', message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` };
  }

  const existing = await documentTypeRepo.findByCode(code);
  if (existing) return { error: 'conflict', message: `Code "${code}" already exists` };

  const created = await documentTypeRepo.create(body, userId);
  return getById(created.id);
}

async function update(id, body, userId) {
  const current = await documentTypeRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Document type not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    return { error: 'badRequest', message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` };
  }

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await documentTypeRepo.findByCode(body.code);
    if (duplicate) return { error: 'conflict', message: `Code "${body.code}" already exists` };
  }

  const updated = await documentTypeRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(updated);
  if (stale) return stale;

  return getById(id);
}

async function remove(id, userId) {
  const current = await documentTypeRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Document type not found' };
  await documentTypeRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await documentTypeRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
