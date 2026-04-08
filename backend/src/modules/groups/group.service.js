const groupRepo = require('./group.repository');

async function getAll(query) {
  return groupRepo.findAll(query);
}

async function getById(id) {
  const group = await groupRepo.findById(id);
  if (!group) return { error: 'notFound', message: 'Group not found' };
  return { group };
}

async function getDropdown(query) {
  return groupRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await groupRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Group code already exists' };

  const group = await groupRepo.create(body, userId);
  return { group };
}

async function update(id, body, userId) {
  const current = await groupRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Group not found' };

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await groupRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Group code already exists' };
  }

  const group = await groupRepo.update(id, body, current, userId);
  return { group };
}

async function remove(id, userId) {
  const current = await groupRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Group not found' };
  await groupRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await groupRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
