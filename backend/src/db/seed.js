require('dotenv').config();
const password = require('../shared/helpers/password.helper');
const { pool } = require('./index');

// Menu definitions
const menus = [
  { name: 'Dashboard', code: 'dashboard', icon: 'assets/icons/heroicons/outline/chart-pie.svg', order: 1 },
  { name: 'Settings', code: 'settings', icon: 'assets/icons/heroicons/outline/cog.svg', order: 2 },
];

// Module definitions (menu_code maps to parent menu)
const modules = [
  { menu_code: 'dashboard', name: 'Dashboard', code: 'dashboard.home', icon: 'assets/icons/heroicons/outline/chart-pie.svg', route: '/dashboard', order: 1 },
  { menu_code: 'settings', name: 'Organization', code: 'settings.organization', icon: 'assets/icons/heroicons/outline/cube.svg', route: '/settings/organization', order: 1 },
  { menu_code: 'settings', name: 'Location', code: 'settings.location', icon: 'assets/icons/heroicons/outline/folder.svg', route: '/settings/location', order: 2 },
  { menu_code: 'settings', name: 'User', code: 'settings.user', icon: 'assets/icons/heroicons/outline/users.svg', route: '/settings/user', order: 3 },
  { menu_code: 'settings', name: 'User Groups', code: 'settings.user_group', icon: 'assets/icons/heroicons/outline/shield-check.svg', route: '/settings/user-group', order: 4 },
];

// Default user groups
const groups = [
  { name: 'Super Admin', code: 'super_admin', description: 'Full system access', is_system: true },
  { name: 'Admin', code: 'admin', description: 'Administrative access' },
  { name: 'Principal', code: 'principal', description: 'School principal access' },
  { name: 'Teacher', code: 'teacher', description: 'Teacher access' },
  { name: 'Staff', code: 'staff', description: 'General staff access' },
];

// Organization seed
const organizations = [
  { name: 'Shaanthi Matriculation School', reg_no: 'REG-2024-001', email: 'info@shaanthi.edu.in', primary_contact_no: '9876543210', website: 'https://www.shaanthi.edu.in' },
];

async function seed() {
  const client = await pool.connect();
  try {
    // 1. Seed super admin user
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
      console.log('Username: superadmin | Password: admin@123');
    } else {
      adminId = existing.rows[0].id;
      console.log('Super admin already exists, skipping user seed');
    }

    // 2. Seed menus
    const menuMap = {};
    for (const menu of menus) {
      const exists = await client.query('SELECT id FROM settings.menus WHERE code = $1', [menu.code]);
      if (exists.rows.length === 0) {
        const result = await client.query(
          `INSERT INTO settings.menus (name, code, icon, display_order, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
          [menu.name, menu.code, menu.icon, menu.order, adminId]
        );
        menuMap[menu.code] = result.rows[0].id;
      } else {
        menuMap[menu.code] = exists.rows[0].id;
      }
    }
    console.log(`Menus seeded (${Object.keys(menuMap).length})`);

    // 3. Seed modules
    const moduleIds = [];
    for (const mod of modules) {
      const menuId = menuMap[mod.menu_code];
      const exists = await client.query('SELECT id FROM settings.modules WHERE code = $1', [mod.code]);
      if (exists.rows.length === 0) {
        const result = await client.query(
          `INSERT INTO settings.modules (menu_id, name, code, icon, route, display_order, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING id`,
          [menuId, mod.name, mod.code, mod.icon, mod.route, mod.order, adminId]
        );
        moduleIds.push(result.rows[0].id);
      } else {
        moduleIds.push(exists.rows[0].id);
      }
    }
    console.log(`Modules seeded (${moduleIds.length})`);

    // 4. Seed user groups
    const groupMap = {};
    for (const group of groups) {
      const exists = await client.query('SELECT id FROM settings.user_groups WHERE code = $1', [group.code]);
      if (exists.rows.length === 0) {
        const result = await client.query(
          `INSERT INTO settings.user_groups (name, code, description, is_system, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
          [group.name, group.code, group.description, group.is_system || false, adminId]
        );
        groupMap[group.code] = result.rows[0].id;
      } else {
        groupMap[group.code] = exists.rows[0].id;
      }
    }
    console.log(`User groups seeded (${Object.keys(groupMap).length})`);

    // 5. Seed group permissions — Super Admin gets full access to all modules
    const superAdminGroupId = groupMap['super_admin'];
    if (superAdminGroupId) {
      for (const moduleId of moduleIds) {
        const exists = await client.query(
          'SELECT id FROM settings.group_permissions WHERE user_group_id = $1 AND module_id = $2',
          [superAdminGroupId, moduleId]
        );
        if (exists.rows.length === 0) {
          await client.query(
            `INSERT INTO settings.group_permissions (user_group_id, module_id, can_view, can_create, can_edit, can_delete, created_by)
             VALUES ($1, $2, true, true, true, true, $3)`,
            [superAdminGroupId, moduleId, adminId]
          );
        }
      }
      console.log('Super Admin group permissions seeded (full access)');
    }

    // 6. Assign super admin user to Super Admin group
    if (superAdminGroupId) {
      await client.query('UPDATE settings.users SET user_group_id = $1 WHERE id = $2', [superAdminGroupId, adminId]);
      console.log('Super admin user assigned to Super Admin group');
    }

    // 7. Seed organizations
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

    console.log('\nSeed completed successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
