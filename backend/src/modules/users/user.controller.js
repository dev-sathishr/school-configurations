const db = require('../../db');
const password = require('../../shared/helpers/password.helper');
const { paginate } = require('../../shared/helpers/pagination.helper');
const res = require('../../shared/helpers/response.helper');

async function getAll(req, resp) {
  try {
    const statusMap = { active: true, inactive: false };
    const filters = {};
    if (req.query.status && statusMap[req.query.status] !== undefined) {
      filters['u.is_active'] = statusMap[req.query.status];
    }

    const result = await paginate({
      table: 'settings.users',
      alias: 'u',
      selectFields: `u.id, u.username, u.full_name, u.email, u.phone, u.role, u.is_active,
                      u.last_login, u.created_by, u.updated_by, u.created_at, u.updated_at,
                      cb.full_name AS created_by_name, ub.full_name AS updated_by_name`,
      joins: 'LEFT JOIN settings.users cb ON u.created_by = cb.id LEFT JOIN settings.users ub ON u.updated_by = ub.id',
      searchColumns: ['u.full_name', 'u.username', 'u.email', 'u.phone'],
      filters,
      orderBy: 'u.created_at',
    }, req.query);

    return res.success(resp, result);
  } catch (err) {
    console.error('Get users error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role, u.is_active,
             u.last_login, u.created_by, u.updated_by, u.created_at, u.updated_at,
             cb.full_name AS created_by_name, ub.full_name AS updated_by_name
      FROM settings.users u
      LEFT JOIN settings.users cb ON u.created_by = cb.id
      LEFT JOIN settings.users ub ON u.updated_by = ub.id
      WHERE u.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.notFound(resp, 'User not found');
    }

    return res.success(resp, { user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const { username, password: pwd, full_name, email, phone, role, is_active } = req.body;

    if (!username || !pwd || !full_name) {
      return res.badRequest(resp, 'Username, password, and full name are required');
    }

    const existing = await db.query('SELECT id FROM settings.users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.conflict(resp, 'Username already exists');
    }

    const hashedPassword = await password.hash(pwd);

    const result = await db.query(`
      INSERT INTO settings.users (username, password, full_name, email, phone, role, is_active, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, username, full_name, email, phone, role, is_active, created_at
    `, [
      username, hashedPassword, full_name,
      email || null, phone || null,
      role || 'clerk', is_active !== undefined ? is_active : true,
      req.user.id, req.user.id,
    ]);

    return res.created(resp, { user: result.rows[0] }, 'User created successfully');
  } catch (err) {
    console.error('Create user error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const { username, password: pwd, full_name, email, phone, role, is_active } = req.body;

    const existing = await db.query('SELECT * FROM settings.users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.notFound(resp, 'User not found');
    }

    if (username && username !== existing.rows[0].username) {
      const duplicate = await db.query('SELECT id FROM settings.users WHERE username = $1', [username]);
      if (duplicate.rows.length > 0) {
        return res.conflict(resp, 'Username already exists');
      }
    }

    const current = existing.rows[0];
    const updatedPassword = pwd ? await password.hash(pwd) : current.password;

    const result = await db.query(`
      UPDATE settings.users SET
        username = $1, password = $2, full_name = $3, email = $4, phone = $5,
        role = $6, is_active = $7, updated_by = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING id, username, full_name, email, phone, role, is_active, updated_at
    `, [
      username || current.username,
      updatedPassword,
      full_name || current.full_name,
      email !== undefined ? (email || null) : current.email,
      phone !== undefined ? (phone || null) : current.phone,
      role || current.role,
      is_active !== undefined ? is_active : current.is_active,
      req.user.id,
      req.params.id,
    ]);

    return res.success(resp, { user: result.rows[0] }, 'User updated successfully');
  } catch (err) {
    console.error('Update user error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const existing = await db.query('SELECT id FROM settings.users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.notFound(resp, 'User not found');
    }

    await db.query('DELETE FROM settings.users WHERE id = $1', [req.params.id]);

    return res.success(resp, {}, 'User deleted successfully');
  } catch (err) {
    console.error('Delete user error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove };
