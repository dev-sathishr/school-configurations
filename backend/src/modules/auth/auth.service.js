const userRepo = require('../users/user.repository');
const password = require('../../shared/helpers/password.helper');
const jwt = require('../../shared/helpers/jwt.helper');
const db = require('../../config/database');

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

async function getMyPermissions(userId) {
  const user = await userRepo.findProfileById(userId);
  if (!user) return { error: 'notFound', message: 'User not found' };
  if (!user.group_id) return { data: { menus: [] } };

  // All users: menus/modules based on group_modules and group_permissions
  const result = await db.query(`
    SELECT m.id AS menu_id, m.name AS menu_name, m.code AS menu_code, m.icon AS menu_icon,
      m.route_path AS menu_route_path, m.display_order AS menu_order,
      mm.module_id, mod.name AS module_name, mod.code AS module_code,
      mod.icon AS module_icon, mod.route_path AS module_route_path, mm.display_order AS module_order,
      p.code AS permission_code
    FROM settings.group_modules gm
    JOIN settings.menus m ON gm.menu_id = m.id AND m.deleted_at IS NULL AND m.is_active = true
    LEFT JOIN settings.menu_modules mm ON m.id = mm.menu_id AND mm.deleted_at IS NULL
    LEFT JOIN settings.modules mod ON mm.module_id = mod.id AND mod.deleted_at IS NULL
    LEFT JOIN settings.group_permissions gp ON gp.group_id = gm.group_id AND gp.module_id = mm.module_id AND gp.deleted_at IS NULL
    LEFT JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
    WHERE gm.group_id = $1 AND gm.deleted_at IS NULL
    ORDER BY m.display_order ASC, mm.display_order ASC
  `, [user.group_id]);

  const menuMap = new Map();
  for (const row of result.rows) {
    if (!menuMap.has(row.menu_id)) {
      menuMap.set(row.menu_id, {
        id: row.menu_id, name: row.menu_name, code: row.menu_code,
        icon: row.menu_icon, route_path: row.menu_route_path,
        display_order: row.menu_order, modules: [],
      });
    }
    if (row.module_id) {
      const menu = menuMap.get(row.menu_id);
      let mod = menu.modules.find(m => m.id === row.module_id);
      if (!mod) {
        mod = {
          id: row.module_id, name: row.module_name, code: row.module_code,
          icon: row.module_icon, route_path: row.module_route_path,
          display_order: row.module_order, permissions: {},
        };
        menu.modules.push(mod);
      }
      if (row.permission_code) {
        mod.permissions[row.permission_code.toLowerCase()] = true;
      }
    }
  }

  // Filter out modules with no permissions and menus with no accessible modules
  const menus = Array.from(menuMap.values()).map(menu => ({
    ...menu,
    modules: menu.modules.filter(mod => Object.keys(mod.permissions).length > 0),
  })).filter(menu => menu.modules.length > 0);

  return { data: { menus } };
}

module.exports = { login, refresh, me, getMyPermissions };
