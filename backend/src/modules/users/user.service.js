const userRepo = require('./user.repository');
const password = require('../../shared/helpers/password.helper');

async function getAll(query, viewOwnUserId) {
  return userRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const user = await userRepo.findById(id);
  if (!user) return { error: 'notFound', message: 'User not found' };
  return { user };
}

async function create(body, userId) {
  const { username, password: pwd, full_name, email, phone, group_id, is_active } = body;

  if (!username || !pwd || !full_name) {
    return { error: 'badRequest', message: 'Username, password, and full name are required' };
  }

  const existing = await userRepo.findByUsernameActive(username);
  if (existing) return { error: 'conflict', message: 'Username already exists' };

  const hashedPassword = await password.hash(pwd);
  const user = await userRepo.create({ username, hashedPassword, full_name, email, phone, group_id, is_active }, userId);

  return { user };
}

async function update(id, body, userId) {
  const rawResult = await require('../../config/database').query('SELECT * FROM settings.users WHERE id = $1', [id]);
  if (rawResult.rows.length === 0) return { error: 'notFound', message: 'User not found' };
  const rawCurrent = rawResult.rows[0];

  if (body.username && body.username !== rawCurrent.username) {
    const duplicate = await userRepo.findByUsernameActive(body.username);
    if (duplicate) return { error: 'conflict', message: 'Username already exists' };
  }

  const hashedPassword = body.password ? await password.hash(body.password) : null;

  const user = await userRepo.update(id, {
    username: body.username,
    hashedPassword,
    full_name: body.full_name,
    email: body.email,
    phone: body.phone,
    group_id: body.group_id,
    is_active: body.is_active,
  }, rawCurrent, userId);

  return { user };
}

async function remove(id, userId) {
  const current = await userRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'User not found' };

  await userRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await userRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
