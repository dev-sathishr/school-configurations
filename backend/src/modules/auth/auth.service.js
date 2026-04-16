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

  const tokenPayload = { id: user.id, username: user.username, group_code: user.group_code || '' };

  return {
    data: {
      access_token: jwt.generateAccessToken(tokenPayload),
      refresh_token: jwt.generateRefreshToken({ id: user.id }),
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        group_id: user.group_id,
        group_code: user.group_code || '',
        group_name: user.group_name || '',
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

    const fullUser = await userRepo.findProfileById(decoded.id);
    if (!fullUser || !fullUser.is_active) return { error: 'unauthorized', message: 'Invalid refresh token' };

    return {
      data: {
        access_token: jwt.generateAccessToken({ id: fullUser.id, username: fullUser.username, group_code: fullUser.group_code || '' }),
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
