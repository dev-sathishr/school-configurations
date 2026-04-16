require('dotenv').config();
const password = require('../shared/helpers/password.helper');
const { pool } = require('./index');

const organizations = [
  { name: 'Shaanthi Matriculation School', reg_no: 'REG-2024-001', email: 'info@shaanthi.edu.in', primary_contact_no: '9876543210', website: 'https://www.shaanthi.edu.in' },
];

async function seed() {
  const client = await pool.connect();
  try {
    // Seed super admin
    const existing = await client.query('SELECT id FROM settings.users WHERE username = $1', ['superadmin']);
    let adminId;

    if (existing.rows.length === 0) {
      const hashedPassword = await password.hash('admin@123');
      const result = await client.query(
        `INSERT INTO settings.users (username, password, full_name, email, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['superadmin', hashedPassword, 'Super Admin', 'admin@shaanthied.com', 'super_admin', true]
      );
      adminId = result.rows[0].id;
      console.log('Default super admin user created');
      console.log('Username: superadmin');
      console.log('Password: admin@123');
    } else {
      adminId = existing.rows[0].id;
      console.log('Super admin already exists, skipping user seed');
    }

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
      { name: 'Settings', code: 'SETTINGS', icon: 'assets/icons/heroicons/outline/cog.svg', route_path: '/settings', display_order: 2 },
      { name: 'Academics', code: 'ACADEMICS', icon: 'assets/icons/heroicons/outline/academic-cap.svg', route_path: '/academics', display_order: 3 },
      { name: 'Finance', code: 'FINANCE', icon: 'assets/icons/heroicons/outline/currency-rupee.svg', route_path: '/finance', display_order: 4 },
      { name: 'Transport', code: 'TRANSPORT', icon: 'assets/icons/heroicons/outline/truck.svg', route_path: '/transport', display_order: 5 },
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

    // Seed Modules (feature pages / sub-items within menus)
    const modules = [
      { name: 'Organizations', code: 'ORGANIZATIONS', icon: 'assets/icons/heroicons/outline/cube.svg', route_path: '/settings/organization', display_order: 1 },
      { name: 'Locations', code: 'LOCATIONS', icon: 'assets/icons/heroicons/outline/bookmark.svg', route_path: '/settings/location', display_order: 2 },
      { name: 'Users', code: 'USERS', icon: 'assets/icons/heroicons/outline/users.svg', route_path: '/settings/user', display_order: 3 },
      { name: 'Modules', code: 'MODULES', icon: 'assets/icons/heroicons/outline/cube.svg', route_path: '/settings/module', display_order: 4 },
      { name: 'Menus', code: 'MENUS', icon: 'assets/icons/heroicons/outline/bookmark.svg', route_path: '/settings/menu', display_order: 5 },
      { name: 'Groups', code: 'GROUPS', icon: 'assets/icons/heroicons/outline/user-group.svg', route_path: '/settings/group', display_order: 6 },
      { name: 'Permissions', code: 'PERMISSIONS', icon: 'assets/icons/heroicons/outline/shield-check.svg', route_path: '/settings/permission', display_order: 7 },
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

    // Seed Menu Modules (link modules under their parent menu)
    const menuModuleMappings = [
      { menu: 'SETTINGS', module: 'ORGANIZATIONS', display_order: 1 },
      { menu: 'SETTINGS', module: 'LOCATIONS', display_order: 2 },
      { menu: 'SETTINGS', module: 'USERS', display_order: 3 },
      { menu: 'SETTINGS', module: 'MODULES', display_order: 4 },
      { menu: 'SETTINGS', module: 'MENUS', display_order: 5 },
      { menu: 'SETTINGS', module: 'GROUPS', display_order: 6 },
      { menu: 'SETTINGS', module: 'PERMISSIONS', display_order: 7 },
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

    // Seed Group Modules (which menus each group can access)
    const groupModuleMappings = [
      { group: 'SUPER_ADMIN', menus: ['DASHBOARD', 'SETTINGS', 'ACADEMICS', 'FINANCE', 'TRANSPORT'] },
      { group: 'ADMIN', menus: ['DASHBOARD', 'SETTINGS', 'ACADEMICS', 'FINANCE'] },
      { group: 'PRINCIPAL', menus: ['DASHBOARD', 'ACADEMICS'] },
      { group: 'TEACHER', menus: ['DASHBOARD', 'ACADEMICS'] },
      { group: 'ACCOUNTANT', menus: ['DASHBOARD', 'FINANCE'] },
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

    // Seed Group Permissions (group + module + permission type)
    const allPermCodes = ['VIEW', 'CREATE', 'EDIT', 'DELETE'];
    const groupPermData = [
      // Super Admin: all permissions on all modules
      ...Object.keys(moduleIds).flatMap(modCode =>
        allPermCodes.map(permCode => ({ group: 'SUPER_ADMIN', module: modCode, permission: permCode }))
      ),
      // Admin: all permissions except DELETE on settings modules
      ...Object.keys(moduleIds).flatMap(modCode =>
        ['VIEW', 'CREATE', 'EDIT'].map(permCode => ({ group: 'ADMIN', module: modCode, permission: permCode }))
      ),
      // Principal: view-only on some modules
      { group: 'PRINCIPAL', module: 'USERS', permission: 'VIEW' },
      { group: 'PRINCIPAL', module: 'ORGANIZATIONS', permission: 'VIEW' },
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

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
