const db = require('../db');
const bcrypt = require('bcryptjs');

async function getAll(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 10));
    const search = req.query.search || '';
    const status = req.query.status || '';
    const order = req.query.order === 'oldest' ? 'ASC' : 'DESC';
    const offset = (page - 1) * size;

    let whereClause = '';
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(u.full_name ILIKE $${idx} OR u.username ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx})`);
    }

    if (status === 'active') {
      conditions.push('u.is_active = true');
    } else if (status === 'inactive') {
      conditions.push('u.is_active = false');
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM settings.users u ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    params.push(size);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const result = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role, u.is_active,
             u.last_login, u.created_by, u.updated_by, u.created_at, u.updated_at,
             cb.full_name AS created_by_name, ub.full_name AS updated_by_name
      FROM settings.users u
      LEFT JOIN settings.users cb ON u.created_by = cb.id
      LEFT JOIN settings.users ub ON u.updated_by = ub.id
      ${whereClause}
      ORDER BY u.created_at ${order}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, params);

    res.json({
      data: result.rows,
      pagination: {
        page,
        size,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / size),
      },
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getById(req, res) {
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
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const { username, password, full_name, email, phone, role, is_active } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ message: 'Username, password, and full name are required' });
    }

    const existing = await db.query('SELECT id FROM settings.users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(`
      INSERT INTO settings.users (username, password, full_name, email, phone, role, is_active, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, username, full_name, email, phone, role, is_active, created_at
    `, [
      username, hashedPassword, full_name,
      email || null, phone || null,
      role || 'clerk', is_active !== undefined ? is_active : true,
      req.user.id, req.user.id
    ]);

    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { username, password, full_name, email, phone, role, is_active } = req.body;

    const existing = await db.query('SELECT * FROM settings.users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username && username !== existing.rows[0].username) {
      const duplicate = await db.query('SELECT id FROM settings.users WHERE username = $1', [username]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ message: 'Username already exists' });
      }
    }

    const current = existing.rows[0];
    const updatedPassword = password ? await bcrypt.hash(password, 10) : current.password;

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
      req.params.id
    ]);

    res.json({ message: 'User updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const existing = await db.query('SELECT id FROM settings.users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db.query('DELETE FROM settings.users WHERE id = $1', [req.params.id]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove };
