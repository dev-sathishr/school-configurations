require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const password = require('../shared/helpers/password.helper');
const { pool } = require('./index');

const organizations = [
  { name: 'My Organization', reg_no: 'REG-2024-001', email: 'info@myorg.com', primary_contact_no: '9876543210', website: 'https://www.myorg.com' },
];

const SEED_ASSETS_DIR = path.join(__dirname, 'seed-assets');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

async function seedProfileImage(client, userId, assetFile) {
  const sourcePath = path.join(SEED_ASSETS_DIR, assetFile);
  if (!fs.existsSync(sourcePath)) {
    console.log(`  Asset ${assetFile} not found, skipping profile image`);
    return;
  }

  const existing = await client.query(
    `SELECT id FROM settings.files
     WHERE entity_type = 'user' AND entity_id = $1 AND file_type = 'profile_image' AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (existing.rows.length > 0) {
    console.log(`  Profile image already set, skipping`);
    return;
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext = path.extname(assetFile).toLowerCase();
  const storedName = `${uuidv4()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, storedName);
  fs.copyFileSync(sourcePath, destPath);

  const stats = fs.statSync(destPath);
  await client.query(
    `INSERT INTO settings.files
       (entity_type, entity_id, file_type, original_name, stored_name, mime_type, size, path, created_by)
     VALUES ('user', $1, 'profile_image', $2, $3, $4, $5, $6, $1)`,
    [userId, assetFile, storedName, MIME_BY_EXT[ext] || 'application/octet-stream', stats.size, `uploads/${storedName}`]
  );
  console.log(`  Profile image seeded (${assetFile})`);
}

async function seed() {
  const client = await pool.connect();
  try {
    // Seed super admin
    const existing = await client.query('SELECT id FROM settings.users WHERE username = $1', ['superadmin']);
    let adminId;

    if (existing.rows.length === 0) {
      const hashedPassword = await password.hash('admin@123');
      const result = await client.query(
        `INSERT INTO settings.users (username, password, full_name, email, phone_code, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['superadmin', hashedPassword, 'Super Admin', 'superadmin@myorg.com', '+91', '9876500001', true]
      );
      adminId = result.rows[0].id;
      console.log('Default super admin user created');
      console.log('Username: superadmin');
      console.log('Password: admin@123');
    } else {
      adminId = existing.rows[0].id;
      console.log('Super admin already exists, skipping user seed');
    }
    await seedProfileImage(client, adminId, 'superadmin.jpg');

    // Seed organizations (skip existing by name)
    let orgInserted = 0;
    for (const org of organizations) {
      const exists = await client.query('SELECT id FROM settings.organizations WHERE name = $1', [org.name]);
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO settings.organizations (name, reg_no, email, primary_contact_code, primary_contact_no, website, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING`,
          [org.name, org.reg_no, org.email, '+91', org.primary_contact_no, org.website || null, true, adminId, adminId]
        );
        orgInserted++;
      }
    }
    console.log(orgInserted > 0 ? `${orgInserted} organization(s) seeded` : 'All organizations already exist, skipping');

    // Clear old seed data (re-seed fresh)
    await client.query('DELETE FROM settings.notifications');
    await client.query('DELETE FROM settings.permission_requests');
    await client.query('DELETE FROM settings.group_permissions');
    await client.query('DELETE FROM settings.group_modules');
    await client.query('DELETE FROM settings.menu_modules');
    await client.query('DELETE FROM settings.permissions');
    await client.query('UPDATE settings.users SET group_id = NULL');
    await client.query('DELETE FROM settings.groups');
    await client.query('DELETE FROM settings.menus');
    await client.query('DELETE FROM settings.modules');

    // Seed Permission types
    const permissionTypes = [
      { name: 'View',   code: 'VIEW',   description: 'Can view records' },
      { name: 'Create', code: 'CREATE', description: 'Can create new records' },
      { name: 'Edit',   code: 'EDIT',   description: 'Can edit existing records' },
      { name: 'Delete', code: 'DELETE', description: 'Can delete records' },
      { name: 'Import', code: 'IMPORT', description: 'Can bulk-import records from file' },
      { name: 'Export', code: 'EXPORT', description: 'Can download records as CSV/Excel/PDF' },
    ];

    const permissionIds = {};
    for (const perm of permissionTypes) {
      const result = await client.query(
        `INSERT INTO settings.permissions (name, code, description, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $5) RETURNING id`,
        [perm.name, perm.code, perm.description, adminId, adminId]
      );
      permissionIds[perm.code] = result.rows[0].id;
    }
    console.log(`Permissions seeded (${Object.keys(permissionIds).length} types)`);

    // Seed Menus (top-level sidebar navigation groups)
    const menus = [
      { key: 'DASHBOARD', name: 'Dashboard', display_name: 'Dashboard', description: 'Quick overview of activity and key stats',            icon: 'assets/icons/heroicons/outline/chart-pie.svg',    route_path: '/dashboard', display_order: 1 },
      { key: 'SETTINGS',  name: 'Settings',  display_name: 'Settings',  description: 'Manage system configuration',                         icon: 'assets/icons/heroicons/outline/cog.svg',          route_path: '/settings',  display_order: 2 },
      { key: 'MASTER',    name: 'Master',    display_name: 'Master',    description: 'Configure sequences, codes and system-level masters',  icon: 'assets/icons/heroicons/outline/adjustments-horizontal.svg', route_path: '/master', display_order: 5 },
      { key: 'ENGINE',    name: 'Engine',    display_name: 'Engine',    description: 'Metadata-driven DocType engine and configuration',     icon: 'assets/icons/heroicons/outline/cog-6-tooth.svg',  route_path: '/engine',    display_order: 90 },
    ];

    const menuIds = {};
    for (const menu of menus) {
      const result = await client.query(
        `INSERT INTO settings.menus (name, display_name, description, icon, route_path, display_order, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8) RETURNING id`,
        [menu.name, menu.display_name, menu.description || null, menu.icon, menu.route_path, menu.display_order, adminId, adminId]
      );
      menuIds[menu.key] = result.rows[0].id;
    }
    console.log(`Menus seeded (${Object.keys(menuIds).length} total)`);

    // Seed Modules
    const modules = [
      { key: 'ORGANIZATIONS', name: 'Organizations',   display_name: 'Organizations',   icon: 'assets/icons/heroicons/outline/cube.svg',               route_path: '/settings/organizations', display_order: 1, enforce_edit_lock: false, description: 'Manage organizations and their details' },
      { key: 'LOCATIONS',     name: 'Locations',       display_name: 'Locations',       icon: 'assets/icons/heroicons/outline/map-pin.svg',            route_path: '/settings/locations',     display_order: 2, enforce_edit_lock: false, description: 'Manage branches, campuses and locations' },
      { key: 'USERS',         name: 'Users',           display_name: 'Users',           icon: 'assets/icons/heroicons/outline/users.svg',              route_path: '/settings/users',         display_order: 3, enforce_edit_lock: false, description: 'Manage system users, roles and permissions' },
      { key: 'MODULES',       name: 'Modules',         display_name: 'Modules',         icon: 'assets/icons/heroicons/outline/cube.svg',               route_path: '/settings/modules',       display_order: 4, enforce_edit_lock: false, description: 'Manage application modules and feature pages' },
      { key: 'MENUS',         name: 'Menus',           display_name: 'Menus',           icon: 'assets/icons/heroicons/outline/bookmark.svg',           route_path: '/settings/menus',         display_order: 5, enforce_edit_lock: false, description: 'Manage navigation menus and assign modules' },
      { key: 'GROUPS',        name: 'Groups',          display_name: 'Groups',          icon: 'assets/icons/heroicons/outline/users.svg',              route_path: '/settings/groups',        display_order: 6, enforce_edit_lock: false, description: 'Manage user groups, menu access and permissions' },
      { key: 'PERMISSIONS',   name: 'Permissions',     display_name: 'Permissions',     icon: 'assets/icons/heroicons/outline/shield-check.svg',       route_path: '/settings/permissions',   display_order: 7, enforce_edit_lock: false, description: 'Manage permission types like View, Create, Edit and Delete' },
      { key: 'SESSIONS',      name: 'Sessions',        display_name: 'Sessions',        icon: 'assets/icons/heroicons/outline/shield-exclamation.svg', route_path: '/settings/session',       display_order: 8, enforce_edit_lock: false, description: 'Monitor active sessions, login history and activity' },
      { key: 'SEQUENCE_CODES',    name: 'Sequence Codes',    display_name: 'Sequence Codes',    icon: 'assets/icons/heroicons/outline/hashtag.svg',                route_path: '/master/sequence', display_order: 1, enforce_edit_lock: false, description: 'Master list of auto-numbering sequence types (e.g. EMPLOYEE, INVOICE)' },
      { key: 'SEQUENCE_CONTROLS', name: 'Sequence Controls', display_name: 'Sequence Controls', icon: 'assets/icons/heroicons/outline/sliders.svg',                route_path: '/master/sequence', display_order: 2, enforce_edit_lock: false, description: 'Per-location prefix, suffix, counter and limit for each sequence type' },
      { key: 'ENGINE_META',   name: 'ENGINE_META',     display_name: 'DocType Manager', icon: 'assets/icons/heroicons/outline/table-cells.svg',        route_path: '/engine/meta',            display_order: 1, enforce_edit_lock: false, description: 'Define custom DocTypes and their fields' },
    ];

    const moduleIds = {};
    for (const mod of modules) {
      const result = await client.query(
        `INSERT INTO settings.modules (name, display_name, icon, route_path, display_order, enforce_edit_lock, description, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9) RETURNING id`,
        [mod.name, mod.display_name, mod.icon, mod.route_path, mod.display_order, !!mod.enforce_edit_lock, mod.description || null, adminId, adminId]
      );
      moduleIds[mod.key] = result.rows[0].id;
    }
    console.log(`Modules seeded (${Object.keys(moduleIds).length} total)`);

    // Seed Menu Modules
    const menuModuleMappings = [
      { menu: 'SETTINGS', module: 'ORGANIZATIONS', display_order: 1 },
      { menu: 'SETTINGS', module: 'LOCATIONS',     display_order: 2 },
      { menu: 'SETTINGS', module: 'USERS',         display_order: 3 },
      { menu: 'SETTINGS', module: 'MODULES',       display_order: 4 },
      { menu: 'SETTINGS', module: 'MENUS',         display_order: 5 },
      { menu: 'SETTINGS', module: 'GROUPS',        display_order: 6 },
      { menu: 'SETTINGS', module: 'PERMISSIONS',   display_order: 7 },
      { menu: 'SETTINGS', module: 'SESSIONS',      display_order: 8 },
      { menu: 'MASTER',   module: 'SEQUENCE_CODES',    display_order: 1 },
      { menu: 'MASTER',   module: 'SEQUENCE_CONTROLS', display_order: 2 },
      { menu: 'ENGINE',   module: 'ENGINE_META',       display_order: 1 },
    ];

    let mmInserted = 0;
    for (const mm of menuModuleMappings) {
      const menuId = menuIds[mm.menu];
      const modId = moduleIds[mm.module];
      if (menuId && modId) {
        await client.query(
          `INSERT INTO settings.menu_modules (menu_id, module_id, display_order, created_by) VALUES ($1, $2, $3, $4)`,
          [menuId, modId, mm.display_order, adminId]
        );
        mmInserted++;
      }
    }
    console.log(`Menu Modules seeded (${mmInserted} mappings)`);

    // Seed Groups
    const groups = [
      { name: 'Super Admin', code: 'SUPER_ADMIN', description: 'Full system access with all permissions' },
      { name: 'Admin',       code: 'ADMIN',       description: 'Administrative access to settings and management' },
    ];

    const groupIds = {};
    for (const group of groups) {
      const result = await client.query(
        `INSERT INTO settings.groups (name, code, description, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $5) RETURNING id`,
        [group.name, group.code, group.description, adminId, adminId]
      );
      groupIds[group.code] = result.rows[0].id;
    }
    console.log(`Groups seeded (${Object.keys(groupIds).length} total)`);

    // Assign super admin user to SUPER_ADMIN group
    await client.query('UPDATE settings.users SET group_id = $1 WHERE id = $2', [groupIds['SUPER_ADMIN'], adminId]);
    console.log('Super admin user assigned to SUPER_ADMIN group');

    // Seed admin user
    const existingAdmin = await client.query('SELECT id FROM settings.users WHERE username = $1', ['admin']);
    let adminUserId;
    if (existingAdmin.rows.length === 0) {
      const adminPwd = await password.hash('admin@123');
      const result = await client.query(
        `INSERT INTO settings.users (username, password, full_name, email, phone_code, phone, group_id, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9) RETURNING id`,
        ['admin', adminPwd, 'Admin User', 'admin@myorg.com', '+91', '9876500002', groupIds['ADMIN'], adminId, adminId]
      );
      adminUserId = result.rows[0].id;
      console.log('Admin user created (username: admin, password: admin@123)');
    } else {
      await client.query('UPDATE settings.users SET group_id = $1 WHERE username = $2', [groupIds['ADMIN'], 'admin']);
      adminUserId = existingAdmin.rows[0].id;
      console.log('Admin user already exists, group_id updated');
    }
    await seedProfileImage(client, adminUserId, 'admin.png');

    // Seed Group Modules (which menus each group can access)
    const groupModuleMappings = [
      { group: 'SUPER_ADMIN', menus: ['DASHBOARD', 'SETTINGS', 'MASTER', 'ENGINE'] },
      { group: 'ADMIN',       menus: ['DASHBOARD', 'SETTINGS'] },
    ];

    let gmInserted = 0;
    for (const gm of groupModuleMappings) {
      const groupId = groupIds[gm.group];
      if (!groupId) continue;
      for (const menuCode of gm.menus) {
        const menuId = menuIds[menuCode];
        if (!menuId) continue;
        await client.query(
          `INSERT INTO settings.group_modules (group_id, menu_id, created_by) VALUES ($1, $2, $3)`,
          [groupId, menuId, adminId]
        );
        gmInserted++;
      }
    }
    console.log(`Group Modules seeded (${gmInserted} mappings)`);

    // Seed Group Permissions — SUPER_ADMIN gets all permissions on all modules
    const allPermCodes = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'IMPORT', 'EXPORT'];
    const groupPermData = Object.keys(moduleIds).flatMap(modCode =>
      allPermCodes.map(permCode => ({ group: 'SUPER_ADMIN', module: modCode, permission: permCode }))
    );

    let gpInserted = 0;
    for (const gp of groupPermData) {
      const groupId = groupIds[gp.group];
      const modId = moduleIds[gp.module];
      const permId = permissionIds[gp.permission];
      if (!groupId || !modId || !permId) continue;
      await client.query(
        `INSERT INTO settings.group_permissions (group_id, module_id, permission_id, created_by) VALUES ($1, $2, $3, $4)`,
        [groupId, modId, permId, adminId]
      );
      gpInserted++;
    }
    console.log(`Group Permissions seeded (${gpInserted} assignments)`);

    // Seed Locations
    const orgResult = await client.query(`SELECT id FROM settings.organizations WHERE name = $1`, [organizations[0].name]);
    const orgId = orgResult.rows[0]?.id;

    if (orgId) {
      await client.query('DELETE FROM settings.user_locations');
      await client.query('DELETE FROM settings.locations WHERE organization_id = $1', [orgId]);

      const locations = [
        { name: 'Main Branch', code: 'MAIN', type: 'main_branch', email: 'main@myorg.com', phone: '9876543210' },
      ];

      const locationIds = {};
      for (const loc of locations) {
        const result = await client.query(
          `INSERT INTO settings.locations (organization_id, name, code, type, email, primary_contact_code, primary_contact_no, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4::settings.location_type, $5, '+91', $6, true, $7, $8) RETURNING id`,
          [orgId, loc.name, loc.code, loc.type, loc.email, loc.phone, adminId, adminId]
        );
        locationIds[loc.code] = result.rows[0].id;
      }
      console.log(`Locations seeded (${Object.keys(locationIds).length} total)`);

      // Map super admin to all locations
      for (const locCode of Object.keys(locationIds)) {
        await client.query(
          'INSERT INTO settings.user_locations (user_id, location_id, is_default, created_by) VALUES ($1, $2, $3, $4)',
          [adminId, locationIds[locCode], true, adminId]
        );
      }
      console.log('Super admin user location mappings seeded');
    }

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
  }
}

async function run() {
  await seed();
  // Always seed doctypes after main seed so engine.doctypes is never empty
  await require('./seed-doctypes').run();
  await pool.end();
}

run();
