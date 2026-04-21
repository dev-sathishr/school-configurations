require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const password = require('../shared/helpers/password.helper');
const { pool } = require('./index');

const organizations = [
  { name: 'Shaanthi Matriculation School', reg_no: 'REG-2024-001', email: 'info@shaanthi.edu.in', primary_contact_no: '9876543210', website: 'https://www.shaanthi.edu.in' },
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

/**
 * Seed a profile image for a user. Idempotent — skips if the user already
 * has a `profile_image` row. Copies the source asset into `uploads/` with a
 * fresh UUID filename and inserts a `settings.files` row matching what the
 * file-upload API would produce, so the existing profile rendering code
 * doesn't need to know this came from the seed.
 */
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
        ['superadmin', hashedPassword, 'Super Admin', 'admin@shaanthied.com', '+91', '9876500001', true]
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
    let inserted = 0;
    for (const org of organizations) {
      const exists = await client.query('SELECT id FROM settings.organizations WHERE name = $1', [org.name]);
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO settings.organizations (name, reg_no, email, primary_contact_code, primary_contact_no, website, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [org.name, org.reg_no, org.email, '+91', org.primary_contact_no, org.website || null, true, adminId, adminId]
        );
        inserted++;
      }
    }
    console.log(inserted > 0 ? `${inserted} organization(s) seeded` : 'All organizations already exist, skipping');

    // Clear old seed data from these tables (re-seed fresh)
    await client.query('DELETE FROM settings.notifications');
    await client.query('DELETE FROM settings.permission_requests');
    await client.query('DELETE FROM settings.group_permissions');
    await client.query('DELETE FROM settings.group_modules');
    await client.query('DELETE FROM settings.menu_modules');
    await client.query('DELETE FROM settings.permissions');
    await client.query('DELETE FROM settings.groups');
    await client.query('DELETE FROM settings.menus');
    await client.query('DELETE FROM settings.modules');

    // Seed Permission types (master data)
    const permissionTypes = [
      { name: 'View', code: 'VIEW', description: 'Can view records' },
      { name: 'Create', code: 'CREATE', description: 'Can create new records' },
      { name: 'Edit', code: 'EDIT', description: 'Can edit existing records' },
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
      { name: 'Dashboard', code: 'DASHBOARD', icon: 'assets/icons/heroicons/outline/chart-pie.svg', route_path: '/dashboard', display_order: 1 },
      { name: 'Academic', code: 'ACADEMIC', icon: 'assets/icons/heroicons/outline/bookmark.svg', route_path: '/academic', display_order: 2 },
      { name: 'Employee', code: 'EMPLOYEE', icon: 'assets/icons/heroicons/outline/users.svg', route_path: '/employee', display_order: 3 },
      { name: 'Settings', code: 'SETTINGS', icon: 'assets/icons/heroicons/outline/cog.svg', route_path: '/settings', display_order: 4 },
    ];

    const menuIds = {};
    for (const menu of menus) {
      const result = await client.query(
        `INSERT INTO settings.menus (name, code, icon, route_path, display_order, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7) RETURNING id`,
        [menu.name, menu.code, menu.icon, menu.route_path, menu.display_order, adminId, adminId]
      );
      menuIds[menu.code] = result.rows[0].id;
    }
    console.log(`Menus seeded (${Object.keys(menuIds).length} total)`);

    // Seed Modules (feature pages / sub-items within menus).
    // Dashboard is intentionally a menu-only entry — a welcome landing page
    // with no CRUD modules. Groups get dashboard access by being assigned the
    // DASHBOARD menu in group_modules; no per-module permissions are needed.
    const modules = [
      // Academic modules
      { name: 'Classes', code: 'CLASSES', icon: 'assets/icons/heroicons/outline/table-cells.svg', route_path: '/academic/class', display_order: 1 },
      // Employee modules
      { name: 'Employee Categories', code: 'EMPLOYEE_CATEGORIES', icon: 'assets/icons/heroicons/outline/bookmark.svg', route_path: '/employee/employee-master', display_order: 1 },
      { name: 'Employee Groups', code: 'EMPLOYEE_GROUPS', icon: 'assets/icons/heroicons/outline/users.svg', route_path: '/employee/employee-master', display_order: 2 },
      { name: 'Designations', code: 'DESIGNATIONS', icon: 'assets/icons/heroicons/outline/cube.svg', route_path: '/employee/employee-master', display_order: 3 },
      // Academic Years is a calendar master used as *config* by admins; it
      // lives under SETTINGS, not ACADEMIC, so route_path + menu_module
      // point there. display_order picks up where the settings modules end.
      { name: 'Academic Years', code: 'ACADEMIC_YEARS', icon: 'assets/icons/heroicons/outline/bookmark.svg', route_path: '/settings/academic-year', display_order: 9 },
      // Settings modules
      { name: 'Organizations', code: 'ORGANIZATIONS', icon: 'assets/icons/heroicons/outline/cube.svg', route_path: '/settings/organization', display_order: 1 },
      { name: 'Locations', code: 'LOCATIONS', icon: 'assets/icons/heroicons/outline/bookmark.svg', route_path: '/settings/location', display_order: 2 },
      { name: 'Users', code: 'USERS', icon: 'assets/icons/heroicons/outline/users.svg', route_path: '/settings/user', display_order: 3 },
      { name: 'Modules', code: 'MODULES', icon: 'assets/icons/heroicons/outline/cube.svg', route_path: '/settings/module', display_order: 4 },
      { name: 'Menus', code: 'MENUS', icon: 'assets/icons/heroicons/outline/bookmark.svg', route_path: '/settings/menu', display_order: 5 },
      { name: 'Groups', code: 'GROUPS', icon: 'assets/icons/heroicons/outline/users.svg', route_path: '/settings/group', display_order: 6 },
      { name: 'Permissions', code: 'PERMISSIONS', icon: 'assets/icons/heroicons/outline/shield-check.svg', route_path: '/settings/permission', display_order: 7 },
      { name: 'Sessions', code: 'SESSIONS', icon: 'assets/icons/heroicons/outline/shield-exclamation.svg', route_path: '/settings/session', display_order: 8 },
    ];

    const moduleIds = {};
    for (const mod of modules) {
      const result = await client.query(
        `INSERT INTO settings.modules (name, code, icon, route_path, display_order, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7) RETURNING id`,
        [mod.name, mod.code, mod.icon, mod.route_path, mod.display_order, adminId, adminId]
      );
      moduleIds[mod.code] = result.rows[0].id;
    }
    console.log(`Modules seeded (${Object.keys(moduleIds).length} total)`);

    // Seed Menu Modules (link modules under their parent menu).
    // DASHBOARD has no entries here — it's a leaf menu pointing directly to
    // its own route_path.
    const menuModuleMappings = [
      // Academic modules
      { menu: 'ACADEMIC', module: 'CLASSES', display_order: 1 },
      // Employee modules
      { menu: 'EMPLOYEE', module: 'EMPLOYEE_CATEGORIES', display_order: 1 },
      { menu: 'EMPLOYEE', module: 'EMPLOYEE_GROUPS', display_order: 2 },
      { menu: 'EMPLOYEE', module: 'DESIGNATIONS', display_order: 3 },
      // Settings modules
      { menu: 'SETTINGS', module: 'ORGANIZATIONS', display_order: 1 },
      { menu: 'SETTINGS', module: 'LOCATIONS', display_order: 2 },
      { menu: 'SETTINGS', module: 'USERS', display_order: 3 },
      { menu: 'SETTINGS', module: 'MODULES', display_order: 4 },
      { menu: 'SETTINGS', module: 'MENUS', display_order: 5 },
      { menu: 'SETTINGS', module: 'GROUPS', display_order: 6 },
      { menu: 'SETTINGS', module: 'PERMISSIONS', display_order: 7 },
      { menu: 'SETTINGS', module: 'SESSIONS', display_order: 8 },
      { menu: 'SETTINGS', module: 'ACADEMIC_YEARS', display_order: 9 },
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
      { name: 'Admin', code: 'ADMIN', description: 'Administrative access to settings and management' },
      { name: 'Principal', code: 'PRINCIPAL', description: 'School principal with academic and admin access' },
      { name: 'Teacher', code: 'TEACHER', description: 'Teaching staff with academic access' },
      { name: 'Accountant', code: 'ACCOUNTANT', description: 'Finance and accounts access' },
      { name: 'Student', code: 'STUDENT', description: 'Student portal access' },
      { name: 'Parent', code: 'PARENT', description: 'Parent portal access' },
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
        ['admin', adminPwd, 'Admin User', 'admin@shaanthied.com', '+91', '9876500002', groupIds['ADMIN'], adminId, adminId]
      );
      adminUserId = result.rows[0].id;
      console.log('Admin user created (username: admin, password: admin@123)');
    } else {
      // Re-assign group_id in case groups were re-created with new IDs
      await client.query('UPDATE settings.users SET group_id = $1 WHERE username = $2', [groupIds['ADMIN'], 'admin']);
      adminUserId = existingAdmin.rows[0].id;
      console.log('Admin user already exists, group_id updated');
    }
    await seedProfileImage(client, adminUserId, 'admin.png');

    // Seed teacher user
    const existingTeacher = await client.query('SELECT id FROM settings.users WHERE username = $1', ['teacher']);
    if (existingTeacher.rows.length === 0) {
      const teacherPwd = await password.hash('teacher@123');
      await client.query(
        `INSERT INTO settings.users (username, password, full_name, email, phone_code, phone, group_id, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)`,
        ['teacher', teacherPwd, 'Teacher User', 'teacher@shaanthied.com', '+91', '9876500003', groupIds['TEACHER'], adminId, adminId]
      );
      console.log('Teacher user created (username: teacher, password: teacher@123)');
    } else {
      await client.query('UPDATE settings.users SET group_id = $1 WHERE username = $2', [groupIds['TEACHER'], 'teacher']);
      console.log('Teacher user already exists, group_id updated');
    }

    // Seed Group Modules (which menus each group can access)
    const groupModuleMappings = [
      { group: 'SUPER_ADMIN', menus: ['DASHBOARD', 'ACADEMIC', 'EMPLOYEE', 'SETTINGS'] },
      { group: 'PRINCIPAL', menus: ['DASHBOARD'] },
      { group: 'TEACHER', menus: ['DASHBOARD'] },
      { group: 'ACCOUNTANT', menus: ['DASHBOARD'] },
      { group: 'STUDENT', menus: ['DASHBOARD'] },
      { group: 'PARENT', menus: ['DASHBOARD'] },
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

    // Seed Group Permissions (group + module + permission type).
    // Dashboard is menu-only, so no per-module permissions belong here —
    // dashboard access is governed purely by group_modules.
    const allPermCodes = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'IMPORT', 'EXPORT'];
    const groupPermData = [
      // Super Admin: all permissions on all modules
      ...Object.keys(moduleIds).flatMap(modCode =>
        allPermCodes.map(permCode => ({ group: 'SUPER_ADMIN', module: modCode, permission: permCode }))
      ),
      // Admin: no permissions (empty — assign via UI)
      // Principal: view-only on selected settings
      { group: 'PRINCIPAL', module: 'USERS', permission: 'VIEW' },
      { group: 'PRINCIPAL', module: 'ORGANIZATIONS', permission: 'VIEW' },
      // Teacher, Accountant, Student, Parent: dashboard-only by default.
    ];

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
    const orgResult = await client.query("SELECT id FROM settings.organizations WHERE name = 'Shaanthi Matriculation School'");
    const orgId = orgResult.rows[0]?.id;

    if (orgId) {
      // Clear old locations (re-seed)
      await client.query('DELETE FROM settings.user_locations');
      await client.query('DELETE FROM settings.locations WHERE organization_id = $1', [orgId]);

      const locations = [
        { name: 'Main Campus', code: 'MAIN', type: 'main_branch', email: 'main@shaanthi.edu.in', phone: '9876543210' },
        { name: 'East Wing Branch', code: 'EAST', type: 'branch', email: 'east@shaanthi.edu.in', phone: '9876543211' },
        { name: 'Sports Complex', code: 'SPORT', type: 'playground', email: 'sports@shaanthi.edu.in', phone: '9876543212' },
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

      // Map locations to users
      // Super admin & admin: all locations; teacher: Main Campus only
      const userLocationMappings = [
        { username: 'superadmin', locations: ['MAIN', 'EAST', 'SPORT'], default: 'MAIN' },
        { username: 'admin', locations: ['MAIN', 'EAST', 'SPORT'], default: 'MAIN' },
        { username: 'teacher', locations: ['MAIN'], default: 'MAIN' },
      ];

      let ulInserted = 0;
      for (const mapping of userLocationMappings) {
        const userResult = await client.query('SELECT id FROM settings.users WHERE username = $1', [mapping.username]);
        const userId = userResult.rows[0]?.id;
        if (!userId) continue;
        for (const locCode of mapping.locations) {
          const locId = locationIds[locCode];
          if (!locId) continue;
          const isDefault = locCode === mapping.default;
          await client.query(
            'INSERT INTO settings.user_locations (user_id, location_id, is_default, created_by) VALUES ($1, $2, $3, $4)',
            [userId, locId, isDefault, adminId]
          );
          ulInserted++;
        }
      }
      console.log(`User Locations seeded (${ulInserted} mappings)`);
    }

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
