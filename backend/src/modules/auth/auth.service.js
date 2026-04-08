const userRepo = require('../users/user.repository');
const password = require('../../shared/helpers/password.helper');
const jwt = require('../../shared/helpers/jwt.helper');

async function login(username, pwd) {
  if (!username || !pwd) {
    return { error: 'badRequest', message: 'Username and password are required' };
  }

  const user = await userRepo.findByUsername(username);
  if (!user) return { error: 'unauthorized', message: 'Invalid username or password' };
  if (!user.is_active) return { error: 'forbidden', message: 'Account is disabled. Contact administrator.' };

  const isValid = await password.compare(pwd, user.password);
  if (!isValid) return { error: 'unauthorized', message: 'Invalid username or password' };

  await userRepo.updateLastLogin(user.id);

  const tokenPayload = { id: user.id, username: user.username, role: user.role };

  return {
    data: {
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
    },
    message: 'Login successful',
  };
}

async function refresh(refreshToken) {
  if (!refreshToken) return { error: 'badRequest', message: 'Refresh token is required' };

  try {
    const decoded = jwt.verifyRefreshToken(refreshToken);
    const user = await userRepo.findByUsername(decoded.id);

    // Use direct query since we need by id, not username
    const userById = await userRepo.findProfileById(decoded.id);
    if (!userById) return { error: 'unauthorized', message: 'Invalid refresh token' };

    // Check if active via raw query
    const db = require('../../config/database');
    const result = await db.query('SELECT * FROM settings.users WHERE id = $1', [decoded.id]);
    const fullUser = result.rows[0];
    if (!fullUser || !fullUser.is_active) return { error: 'unauthorized', message: 'Invalid refresh token' };

    return {
      data: {
        access_token: jwt.generateAccessToken({ id: fullUser.id, username: fullUser.username, role: fullUser.role }),
      },
    };
  } catch (err) {
    return { error: 'unauthorized', message: 'Invalid or expired refresh token' };
  }
}

async function me(userId) {
  const user = await userRepo.findProfileById(userId);
  if (!user) return { error: 'notFound', message: 'User not found' };
  return { data: { user } };
}

module.exports = { login, refresh, me };
