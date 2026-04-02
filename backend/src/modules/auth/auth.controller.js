const db = require('../../db');
const password = require('../../shared/helpers/password.helper');
const jwt = require('../../shared/helpers/jwt.helper');
const res = require('../../shared/helpers/response.helper');

async function login(req, resp) {
  try {
    const { username, password: pwd } = req.body;

    if (!username || !pwd) {
      return res.badRequest(resp, 'Username and password are required');
    }

    const result = await db.query('SELECT * FROM settings.users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.unauthorized(resp, 'Invalid username or password');
    }

    if (!user.is_active) {
      return res.forbidden(resp, 'Account is disabled. Contact administrator.');
    }

    const isValid = await password.compare(pwd, user.password);
    if (!isValid) {
      return res.unauthorized(resp, 'Invalid username or password');
    }

    await db.query('UPDATE settings.users SET last_login = NOW() WHERE id = $1', [user.id]);

    const tokenPayload = { id: user.id, username: user.username, role: user.role };

    return res.success(resp, {
      access_token: jwt.generateAccessToken(tokenPayload),
      refresh_token: jwt.generateRefreshToken({ id: user.id }),
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        last_login: user.last_login,
      },
    }, 'Login successful');
  } catch (err) {
    console.error('Login error:', err);
    return res.error(resp);
  }
}

async function refresh(req, resp) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.badRequest(resp, 'Refresh token is required');
    }

    const decoded = jwt.verifyRefreshToken(refresh_token);
    const result = await db.query('SELECT * FROM settings.users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.unauthorized(resp, 'Invalid refresh token');
    }

    return res.success(resp, {
      access_token: jwt.generateAccessToken({ id: user.id, username: user.username, role: user.role }),
    });
  } catch (err) {
    return res.unauthorized(resp, 'Invalid or expired refresh token');
  }
}

async function me(req, resp) {
  try {
    const result = await db.query(
      'SELECT id, username, full_name, email, phone, role, is_active, last_login, created_at FROM settings.users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.notFound(resp, 'User not found');
    }

    return res.success(resp, { user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.error(resp);
  }
}

async function logout(req, resp) {
  return res.success(resp, {}, 'Logout successful');
}

module.exports = { login, refresh, me, logout };
