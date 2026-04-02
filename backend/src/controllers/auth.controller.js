const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const result = await db.query('SELECT * FROM settings.users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled. Contact administrator.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    await db.query('UPDATE settings.users SET last_login = NOW() WHERE id = $1', [user.id]);

    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: Number(process.env.JWT_EXPIRATION_MS) / 1000 }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: Number(process.env.JWT_REFRESH_EXPIRATION_MS) / 1000 }
    );

    res.json({
      message: 'Login successful',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        last_login: user.last_login,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function refresh(req, res) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const result = await db.query('SELECT * FROM settings.users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: Number(process.env.JWT_EXPIRATION_MS) / 1000 }
    );

    res.json({ access_token: accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

async function me(req, res) {
  try {
    const result = await db.query(
      'SELECT id, username, full_name, email, phone, role, is_active, last_login, created_at FROM settings.users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function logout(req, res) {
  try {
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { login, refresh, me, logout };
