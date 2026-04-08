const db = require('../../config/database');
const userRepo = require('../users/user.repository');
const password = require('../../shared/helpers/password.helper');
const jwt = require('../../shared/helpers/jwt.helper');
const userLocationRepo = require('../user-locations/user-location.repository');

/**
 * Build menu tree from user's group permissions.
 * Returns the MenuItem[] structure the frontend expects.
 */
async function buildMenuForUser(userId, userGroupId) {
  // Check if user's group is a system group (full access)
  let isSystem = false;
  if (userGroupId) {
    const groupCheck = await db.query(
      'SELECT is_system FROM settings.user_groups WHERE id = $1 AND deleted_at IS NULL',
      [userGroupId]
    );
    isSystem = groupCheck.rows[0]?.is_system || false;
  }

  let moduleRows;
  if (isSystem) {
    // System group gets all active modules
    moduleRows = (await db.query(`
      SELECT m.id AS module_id, m.name AS module_name, m.code AS module_code, m.icon AS module_icon,
             m.route, m.display_order AS module_order,
             mn.id AS menu_id, mn.name AS menu_name, mn.code AS menu_code, mn.icon AS menu_icon,
             mn.display_order AS menu_order,
             true AS can_view, true AS can_create, true AS can_edit, true AS can_delete
      FROM settings.modules m
      JOIN settings.menus mn ON mn.id = m.menu_id
      WHERE m.is_active = true AND m.deleted_at IS NULL
        AND mn.is_active = true AND mn.deleted_at IS NULL
      ORDER BY mn.display_order, m.display_order
    `)).rows;
  } else if (userGroupId) {
    // Regular group gets only permitted modules
    moduleRows = (await db.query(`
      SELECT m.id AS module_id, m.name AS module_name, m.code AS module_code, m.icon AS module_icon,
             m.route, m.display_order AS module_order,
             mn.id AS menu_id, mn.name AS menu_name, mn.code AS menu_code, mn.icon AS menu_icon,
             mn.display_order AS menu_order,
             gp.can_view, gp.can_create, gp.can_edit, gp.can_delete
      FROM settings.group_permissions gp
      JOIN settings.modules m ON m.id = gp.module_id
      JOIN settings.menus mn ON mn.id = m.menu_id
      WHERE gp.user_group_id = $1 AND gp.can_view = true
        AND m.is_active = true AND m.deleted_at IS NULL
        AND mn.is_active = true AND mn.deleted_at IS NULL
      ORDER BY mn.display_order, m.display_order
    `, [userGroupId])).rows;
  } else {
    moduleRows = [];
  }

  // Group by menu → build MenuItem[] structure
  const menuMap = new Map();
  for (const row of moduleRows) {
    if (!menuMap.has(row.menu_id)) {
      menuMap.set(row.menu_id, {
        group: '',
        separator: false,
        items: [{
          icon: row.menu_icon,
          label: row.menu_code,
          route: null,
          children: [],
        }],
        _menuOrder: row.menu_order,
        _menuCode: row.menu_code,
      });
    }

    const menu = menuMap.get(row.menu_id);
    // If this module's route matches a top-level page (e.g. dashboard), set it on the menu item directly
    const menuItem = menu.items[0];

    // Check if this is a single-module menu (like Dashboard)
    if (row.module_code === row.menu_code + '.home' || row.module_code === row.menu_code) {
      menuItem.route = row.route;
      menuItem.icon = row.module_icon || row.menu_icon;
      menuItem._permissions = {
        can_view: row.can_view, can_create: row.can_create,
        can_edit: row.can_edit, can_delete: row.can_delete,
      };
    } else {
      // Add as child module
      if (!menuItem.children) menuItem.children = [];
      menuItem.children.push({
        icon: row.module_icon,
        label: row.module_code,
        route: row.route,
        _permissions: {
          can_view: row.can_view, can_create: row.can_create,
          can_edit: row.can_edit, can_delete: row.can_delete,
        },
      });
    }
  }

  // Convert map to array, handle single-module menus (no children → direct route)
  const result = [];
  for (const [, menu] of menuMap) {
    const menuItem = menu.items[0];
    // If menu has children and also a direct route, it means the menu itself is a page
    // If no children, it's a direct link (like Dashboard)
    if (menuItem.children && menuItem.children.length === 0) {
      delete menuItem.children;
    }
    if (menuItem.children && !menuItem.route) {
      // Menu with only children — set route to first child's route as default
      menuItem.route = '/' + menu._menuCode;
    }
    result.push(menu);
  }

  // Sort by menu order
  result.sort((a, b) => a._menuOrder - b._menuOrder);

  // Clean up internal fields
  for (const menu of result) {
    delete menu._menuOrder;
    delete menu._menuCode;
  }

  return result;
}

/**
 * Build permissions map from group_permissions for the frontend.
 * Returns: { 'settings.organization': { can_view: true, can_create: true, ... }, ... }
 */
async function buildPermissionsForUser(userGroupId) {
  if (!userGroupId) return {};

  const groupCheck = await db.query(
    'SELECT is_system FROM settings.user_groups WHERE id = $1 AND deleted_at IS NULL',
    [userGroupId]
  );
  const isSystem = groupCheck.rows[0]?.is_system || false;

  if (isSystem) {
    // Return all modules with full permissions
    const modules = await db.query(
      'SELECT code FROM settings.modules WHERE is_active = true AND deleted_at IS NULL'
    );
    const perms = {};
    for (const m of modules.rows) {
      perms[m.code] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
    }
    return perms;
  }

  const result = await db.query(`
    SELECT m.code, gp.can_view, gp.can_create, gp.can_edit, gp.can_delete
    FROM settings.group_permissions gp
    JOIN settings.modules m ON m.id = gp.module_id
    WHERE gp.user_group_id = $1 AND m.deleted_at IS NULL
  `, [userGroupId]);

  const perms = {};
  for (const row of result.rows) {
    perms[row.code] = {
      can_view: row.can_view, can_create: row.can_create,
      can_edit: row.can_edit, can_delete: row.can_delete,
    };
  }
  return perms;
}

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

  const tokenPayload = { id: user.id, username: user.username, role: user.role, group_id: user.user_group_id || null };

  // Build menu tree and permissions based on user's group
  const menu = await buildMenuForUser(user.id, user.user_group_id);
  const permissions = await buildPermissionsForUser(user.user_group_id);

  // Get user's assigned locations
  const locations = await userLocationRepo.findByUserId(user.id);
  const userLocations = locations.map((l) => ({
    location_id: l.location_id,
    name: l.name,
    code: l.code,
    type: l.type,
    is_default: l.is_default,
    organization: { id: l.org_id, name: l.org_name },
  }));
  const defaultLocation = userLocations.find((l) => l.is_default);

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
        user_group_id: user.user_group_id,
        last_login: user.last_login,
      },
      menu,
      permissions,
      locations: userLocations,
      default_location_id: defaultLocation?.location_id || null,
    },
    message: 'Login successful',
  };
}

async function refresh(refreshToken) {
  if (!refreshToken) return { error: 'badRequest', message: 'Refresh token is required' };

  try {
    const decoded = jwt.verifyRefreshToken(refreshToken);
    const result = await db.query('SELECT * FROM settings.users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user || !user.is_active) return { error: 'unauthorized', message: 'Invalid refresh token' };

    return {
      data: {
        access_token: jwt.generateAccessToken({
          id: user.id, username: user.username, role: user.role, group_id: user.user_group_id || null,
        }),
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
