const userRepo = require('../settings/users/user.repository');
const locationRepo = require('../settings/locations/location.repository');
const sessionRepo = require('../settings/sessions/session.repository');
const fileRepo = require('../files/file.repository');
const password = require('../../shared/helpers/password.helper');
const jwt = require('../../shared/helpers/jwt.helper');
const db = require('../../config/database');

/**
 * Sign in — verifies creds, creates a session row (for audit + revocation),
 * and embeds the session id as a JWT claim so the authenticate middleware
 * can bind every subsequent request to that session.
 *
 * `context` captures device + location info from the sign-in form:
 *   { ip_address, user_agent, latitude, longitude, location_label }
 */
async function login(username, pwd, context = {}) {
  if (!username || !pwd) {
    return { error: 'badRequest', message: 'Username and password are required' };
  }

  const user = await userRepo.findByUsername(username);
  if (!user) return { error: 'unauthorized', message: 'Invalid username or password' };
  if (!user.is_active) return { error: 'forbidden', message: 'Account is disabled. Contact administrator.' };

  const isValid = await password.compare(pwd, user.password);
  if (!isValid) return { error: 'unauthorized', message: 'Invalid username or password' };

  await userRepo.updateLastLogin(user.id);

  const session = await sessionRepo.create({
    user_id: user.id,
    ip_address: context.ip_address || null,
    user_agent: context.user_agent || null,
    latitude: context.latitude ?? null,
    longitude: context.longitude ?? null,
    location_label: context.location_label || null,
    login_method: 'password',
  });

  const tokenPayload = {
    id: user.id,
    username: user.username,
    group_code: user.group_code || '',
    session_id: session.id,
  };
  const profileFile = await fileRepo.findOneByEntity('user', user.id, 'profile_image');

  return {
    data: {
      access_token: jwt.generateAccessToken(tokenPayload),
      refresh_token: jwt.generateRefreshToken({ id: user.id, session_id: session.id }),
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        group_id: user.group_id,
        group_code: user.group_code || '',
        group_name: user.group_name || '',
        last_login: user.last_login,
        profile_file_id: profileFile?.id || null,
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

    // Session must still be active. A revoked or ended session can't mint new
    // tokens via refresh — the user has to sign in again.
    if (decoded.session_id) {
      const session = await sessionRepo.findById(decoded.session_id);
      if (!session || session.logout_at || session.revoked_at) {
        return { error: 'unauthorized', message: 'Session is no longer valid' };
      }
    }

    return {
      data: {
        access_token: jwt.generateAccessToken({
          id: fullUser.id,
          username: fullUser.username,
          group_code: fullUser.group_code || '',
          session_id: decoded.session_id,
        }),
      },
    };
  } catch (err) {
    return { error: 'unauthorized', message: 'Invalid or expired refresh token' };
  }
}

async function logout(sessionId) {
  if (sessionId) {
    await sessionRepo.endSession(sessionId);
  }
  return { data: {} };
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
  // Track menus that the group_modules grant but have zero modules defined at
  // all (menu-only entries like Dashboard — a welcome landing page, no CRUD).
  // These must survive the permission filter below; filtering them out would
  // leave the user with no way into a menu they were explicitly granted.
  const menuOnly = new Set();

  for (const row of result.rows) {
    if (!menuMap.has(row.menu_id)) {
      menuMap.set(row.menu_id, {
        id: row.menu_id, name: row.menu_name, code: row.menu_code,
        icon: row.menu_icon, route_path: row.menu_route_path,
        display_order: row.menu_order, modules: [],
      });
      menuOnly.add(row.menu_id);
    }
    if (row.module_id) {
      menuOnly.delete(row.menu_id);
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

  // Drop modules the user has no permissions on, then drop menus that end up
  // empty — except menu-only entries, which are access-by-presence.
  const menus = Array.from(menuMap.values()).map(menu => ({
    ...menu,
    modules: menu.modules.filter(mod => Object.keys(mod.permissions).length > 0),
  })).filter(menu => menu.modules.length > 0 || menuOnly.has(menu.id));

  return { data: { menus } };
}

async function getMyLocations(userId) {
  const user = await userRepo.findProfileById(userId);
  if (!user) return { error: 'notFound', message: 'User not found' };

  // User's explicitly permitted locations. If none assigned, fall back to
  // every active location — users without an explicit scope (e.g. super admin)
  // get the full set. Presence of any row switches the user into scoped mode.
  const assigned = await userRepo.getUserLocations(userId);
  if (assigned.length > 0) {
    return { data: { locations: assigned, scoped: true } };
  }

  const all = await locationRepo.findAllActive();
  return { data: { locations: all.map((l) => ({ ...l, is_default: false })), scoped: false } };
}

module.exports = { login, refresh, logout, me, getMyPermissions, getMyLocations };
