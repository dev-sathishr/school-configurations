const userRepo = require('./user.repository');
const fileRepo = require('../../files/file.repository');
const password = require('../../../shared/helpers/password.helper');
const { bulkImport, pick, asBool } = require('../../../shared/helpers/bulk-import.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

function mapUser(user) {
  if (!user) return user;
  const { group_id, group_name, group_code, ...rest } = user;
  return {
    ...rest,
    group: group_id
      ? { id: group_id, name: group_name || '', code: group_code || '' }
      : null,
  };
}

async function syncEmployeeEmail(personId, email) {
  if (!personId || !email) return;
  const db = require('../../../config/database');
  // Only update if the employee currently has no email — never overwrite an existing one
  await db.query(
    `UPDATE employee.employee_info SET email = $1, updated_at = NOW() WHERE id = $2 AND (email IS NULL OR email = '') AND deleted_at IS NULL`,
    [email, personId]
  );
}

async function assertPersonNotLinked(personId, excludeUserId = null) {
  const db = require('../../../config/database');
  let q = 'SELECT id FROM settings.users WHERE person_id = $1 AND deleted_at IS NULL';
  const params = [personId];
  if (excludeUserId) { q += ' AND id != $2'; params.push(excludeUserId); }
  const result = await db.query(q, params);
  if (result.rows.length > 0) return { error: 'conflict', message: 'This person is already linked to another user account' };
  return null;
}

async function getAll(query, viewOwnUserId) {
  const result = await userRepo.findAll(query, viewOwnUserId);
  result.data = (result.data || []).map(mapUser);
  return result;
}

async function getById(id) {
  const user = await userRepo.findById(id);
  if (!user) return { error: 'notFound', message: 'User not found' };

  const [locations, profileImage] = await Promise.all([
    userRepo.getUserLocations(id),
    fileRepo.findOneByEntity('user', id, 'profile_image'),
  ]);

  return {
    data: mapUser({
      ...user,
      locations,
      profile_image: profileImage || null,
    }),
  };
}

async function create(body, userId) {
  const { username, password: pwd, full_name, email, phone, group_id, is_active, person_type, person_id } = body;

  if (!username || !pwd || !full_name) {
    return { error: 'badRequest', message: 'Username, password, and full name are required' };
  }

  const existing = await userRepo.findByUsernameActive(username);
  if (existing) return { error: 'conflict', message: 'Username already exists' };

  if (person_id) {
    const linkErr = await assertPersonNotLinked(person_id);
    if (linkErr) return linkErr;
  }

  const hashedPassword = await password.hash(pwd);
  const user = await userRepo.create({ username, hashedPassword, full_name, email, phone_code: body.phone_code, phone, group_id, person_type: person_type || 'staff', person_id: person_id || null, is_active }, userId);

  if (body.location_ids && body.location_ids.length > 0) {
    const defaultLocId = body.default_location_id || body.location_ids[0];
    await userRepo.saveUserLocations(user.id, body.location_ids, defaultLocId, userId);
  }

  if (person_type === 'employee' && person_id && email) {
    await syncEmployeeEmail(person_id, email);
  }

  return getById(user.id);
}

async function update(id, body, userId) {
  const rawResult = await require('../../../config/database').query('SELECT * FROM settings.users WHERE id = $1', [id]);
  if (rawResult.rows.length === 0) return { error: 'notFound', message: 'User not found' };
  const rawCurrent = rawResult.rows[0];

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  if (body.username && body.username !== rawCurrent.username) {
    const duplicate = await userRepo.findByUsernameActive(body.username);
    if (duplicate) return { error: 'conflict', message: 'Username already exists' };
  }

  const hashedPassword = body.password ? await password.hash(body.password) : null;

  if (body.person_id && body.person_id !== rawCurrent.person_id) {
    const linkErr = await assertPersonNotLinked(body.person_id, id);
    if (linkErr) return linkErr;
  }

  const user = await userRepo.update(id, {
    username: body.username,
    hashedPassword,
    full_name: body.full_name,
    email: body.email,
    phone_code: body.phone_code,
    phone: body.phone,
    group_id: body.group_id,
    person_type: body.person_type,
    person_id: body.person_id,
    is_active: body.is_active,
  }, rawCurrent, userId, version.data);

  const stale = toConflictIfStale(user);
  if (stale) return stale;

  if (body.location_ids !== undefined) {
    const locIds = body.location_ids || [];
    const defaultLocId = body.default_location_id || (locIds.length > 0 ? locIds[0] : null);
    await userRepo.saveUserLocations(id, locIds, defaultLocId, userId);
  }

  const effectivePersonId = body.person_id ?? rawCurrent.person_id;
  const effectivePersonType = body.person_type ?? rawCurrent.person_type;
  if (effectivePersonType === 'employee' && effectivePersonId && body.email) {
    await syncEmployeeEmail(effectivePersonId, body.email);
  }

  return getById(id);
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

async function importRows(rows, userId) {
  return bulkImport({
    rows, create, userId,
    preResolve: async (parsedRows) => {
      // If the file uses group_code, resolve to group_id up-front.
      if (parsedRows.some((r) => !r.group_id && (r.group_code || r['Group Code']))) {
        const db = require('../../../config/database');
        const result = await db.query('SELECT id, code FROM settings.groups WHERE deleted_at IS NULL');
        return { groupByCode: new Map(result.rows.map((g) => [String(g.code).toUpperCase(), g.id])) };
      }
      return {};
    },
    transformRow: async (raw, ctx) => {
      const username = pick(raw, 'username', 'Username');
      const row = {
        username,
        password: pick(raw, 'password', 'Password') || username,
        full_name: pick(raw, 'full_name', 'Full Name'),
        email: pick(raw, 'email', 'Email'),
        phone: pick(raw, 'phone', 'Phone'),
        phone_code: pick(raw, 'phone_code', 'Phone Code') || '+91',
        group_id: pick(raw, 'group_id', 'Group ID'),
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
      };
      const groupCode = pick(raw, 'group_code', 'Group Code');
      if (!row.group_id && groupCode && ctx.groupByCode) {
        row.group_id = ctx.groupByCode.get(String(groupCode).toUpperCase());
        if (!row.group_id) return { error: `Unknown group_code: ${groupCode}` };
      }
      if (!row.username || !row.full_name || !row.group_id) {
        return { error: 'username, full_name, and group_id (or group_code) are required' };
      }
      return { row };
    },
  });
}

async function checkUnique(field, value, excludeId = null) {
  const labelMap = { email: 'Email', phone: 'Phone number' };
  if (!labelMap[field]) return { error: 'badRequest', message: 'Invalid field' };
  if (!value || !value.trim()) return { data: { available: true } };
  const existing = await userRepo.checkUniqueField(field, value.trim(), excludeId);
  if (existing) return { data: { available: false, message: `${labelMap[field]} is already registered` } };
  return { data: { available: true } };
}

async function getDropdown(query) {
  const data = await userRepo.getDropdown(query);
  return { data };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, importRows, checkUnique, getDropdown };
