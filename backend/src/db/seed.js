require('dotenv').config();
const password = require('../shared/helpers/password.helper');
const { pool } = require('./index');

const organizations = [
  { name: 'Shaanthi Matriculation School', reg_no: 'REG-2024-001', email: 'info@shaanthi.edu.in', primary_contact_no: '9876543210', website: 'https://www.shaanthi.edu.in', notes: 'Main branch school' },
  { name: 'Bharathi Vidyalaya', reg_no: 'REG-2024-002', email: 'admin@bharathi.edu.in', primary_contact_no: '9876543211', website: 'https://www.bharathi.edu.in', notes: 'CBSE affiliated school' },
  { name: 'Sunrise International School', reg_no: 'REG-2024-003', email: 'contact@sunrise.edu.in', primary_contact_no: '9876543212', website: 'https://www.sunrise.edu.in', notes: 'International curriculum' },
  { name: 'Green Valley Public School', reg_no: 'REG-2024-004', email: 'office@greenvalley.edu.in', primary_contact_no: '9876543213', website: 'https://www.greenvalley.edu.in', notes: 'Eco-friendly campus' },
  { name: 'Sri Vidya Academy', reg_no: 'REG-2024-005', email: 'info@srividya.edu.in', primary_contact_no: '9876543214', notes: 'State board school' },
  { name: 'Modern Public School', reg_no: 'REG-2024-006', email: 'admin@modernpublic.edu.in', primary_contact_no: '9876543215', website: 'https://www.modernpublic.edu.in', notes: 'ICSE board' },
  { name: 'Little Flower Convent School', reg_no: 'REG-2024-007', email: 'info@littleflower.edu.in', primary_contact_no: '9876543216', notes: 'Convent school with hostel' },
  { name: 'National Academy of Excellence', reg_no: 'REG-2024-008', email: 'admin@nae.edu.in', primary_contact_no: '9876543217', website: 'https://www.nae.edu.in', notes: 'Competitive exam focused' },
  { name: 'Lakshmi Nursery & Primary School', reg_no: 'REG-2024-009', email: 'info@lakshmi.edu.in', primary_contact_no: '9876543218', notes: 'Nursery and primary school' },
  { name: 'Vivekananda Vidyapeeth', reg_no: 'REG-2024-010', email: 'office@vivekananda.edu.in', primary_contact_no: '9876543219', website: 'https://www.vivekananda.edu.in', notes: 'Value-based education' },
  { name: 'Cambridge International Academy', reg_no: 'REG-2024-011', email: 'info@cambridge.edu.in', primary_contact_no: '9876543220', website: 'https://www.cambridge.edu.in', notes: 'Cambridge IGCSE curriculum' },
  { name: 'Saraswathi Vidhyashram', reg_no: 'REG-2024-012', email: 'admin@saraswathi.edu.in', primary_contact_no: '9876543221', notes: 'Tamil medium school' },
  { name: 'DAV Model School', reg_no: 'REG-2024-013', email: 'info@davmodel.edu.in', primary_contact_no: '9876543222', website: 'https://www.davmodel.edu.in', notes: 'DAV group of schools' },
  { name: 'Holy Cross Matriculation School', reg_no: 'REG-2024-014', email: 'office@holycross.edu.in', primary_contact_no: '9876543223', notes: 'Matriculation board' },
  { name: 'Kendriya Vidyalaya Sangathan', reg_no: 'REG-2024-015', email: 'info@kvs.edu.in', primary_contact_no: '9876543224', website: 'https://www.kvs.edu.in', notes: 'Central government school' },
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
          `INSERT INTO settings.organizations (name, reg_no, email, primary_contact_code, primary_contact_no, website, is_active, notes, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [org.name, org.reg_no, org.email, '+91', org.primary_contact_no, org.website || null, true, org.notes || null, adminId, adminId]
        );
        inserted++;
      }
    }
    console.log(inserted > 0 ? `${inserted} organizations seeded` : 'All organizations already exist, skipping');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
