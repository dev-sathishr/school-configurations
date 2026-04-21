const locationRepo = require('./location.repository');
const db = require('../../../config/database');
const { validate } = require('../../../shared/helpers/validate.helper');
const { saveAddresses, getAddresses } = require('../../../shared/helpers/address.helper');
const { bulkImport, pick, asBool } = require('../../../shared/helpers/bulk-import.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

const LOC_RULES = {
  organization_id: { required: true, label: 'Organization' },
  name: { required: true, min: 3, max: 100, label: 'Name' },
  code: { required: true, min: 3, max: 5, label: 'Code' },
  type: { required: true, label: 'Type' },
  email: { max: 100, email: true, label: 'Email' },
  primary_contact_no: { required: true, label: 'Primary Contact' },
  notes: { max: 500, label: 'Notes' },
};

function mapRow(row) {
  return {
    id: row.id, name: row.name, code: row.code, type: row.type, email: row.email,
    primary_contact_code: row.primary_contact_code, primary_contact_no: row.primary_contact_no,
    is_active: row.is_active, created_at: row.created_at, updated_at: row.updated_at,
    organization: { id: row.org_id, name: row.org_name },
    created_by_name: row.created_by_name, updated_by_name: row.updated_by_name,
  };
}

function mapDetailRow(row) {
  return {
    id: row.id, name: row.name, code: row.code, type: row.type,
    email: row.email, primary_contact_code: row.primary_contact_code, primary_contact_no: row.primary_contact_no,
    alternate_contact_code: row.alternate_contact_code, alternate_contact_no: row.alternate_contact_no,
    is_active: row.is_active, notes: row.notes, created_by: row.created_by, updated_by: row.updated_by,
    created_at: row.created_at, updated_at: row.updated_at,
    created_by_name: row.created_by_name, updated_by_name: row.updated_by_name,
    organization: { id: row.org_id, name: row.org_name },
  };
}

async function getAll(query, viewOwnUserId) {
  const result = await locationRepo.findAll(query, viewOwnUserId);
  result.data = result.data.map(mapRow);
  return result;
}

async function getById(id) {
  const row = await locationRepo.findById(id);
  if (!row) return { error: 'notFound', message: 'Location not found' };

  const addresses = await getAddresses('location', id);
  return { data: { ...mapDetailRow(row), addresses } };
}

async function create(body, userId) {
  const errors = validate(body, LOC_RULES);
  if (!body.addresses || !Array.isArray(body.addresses) || body.addresses.length === 0) {
    errors.push('At least one address is required');
  }
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Unique checks
  if (body.code) {
    const exists = await locationRepo.checkUnique('code', body.code, null, { organization_id: body.organization_id });
    if (exists) return { error: 'conflict', message: 'Location code already exists in this organization' };
  }
  if (body.email) {
    const exists = await locationRepo.checkUnique('email', body.email);
    if (exists) return { error: 'conflict', message: 'Email already exists' };
  }

  const location = await locationRepo.create(body, userId);
  await saveAddresses('location', location.id, body.addresses, userId);

  return { data: location };
}

async function update(id, body, userId) {
  const current = await locationRepo.findByField('id', id);
  if (!current) return { error: 'notFound', message: 'Location not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  const merged = { ...current, ...body };
  const errors = validate(merged, LOC_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Unique checks (exclude self)
  const orgId = body.organization_id || current.organization_id;
  if (body.code && body.code.trim().toLowerCase() !== current.code?.toLowerCase()) {
    const exists = await locationRepo.checkUnique('code', body.code, id, { organization_id: orgId });
    if (exists) return { error: 'conflict', message: 'Location code already exists in this organization' };
  }
  if (body.email && body.email.trim().toLowerCase() !== current.email?.toLowerCase()) {
    const exists = await locationRepo.checkUnique('email', body.email, id);
    if (exists) return { error: 'conflict', message: 'Email already exists' };
  }

  const location = await locationRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(location);
  if (stale) return stale;

  await saveAddresses('location', id, body.addresses, userId);

  return { data: location };
}

async function remove(id, userId) {
  const current = await locationRepo.findByField('id', id);
  if (!current) return { error: 'notFound', message: 'Location not found' };

  await locationRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await locationRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function getDropdown(query) {
  const page = parseInt(query.page) || 1;
  const size = parseInt(query.size) || 20;
  const search = (query.search || '').trim();
  return locationRepo.findDropdown({ page, size, search });
}

async function importRows(rows, userId) {
  return bulkImport({
    rows, create, userId,
    preResolve: async () => {
      const result = await db.query('SELECT id, name FROM settings.organizations WHERE deleted_at IS NULL');
      return { orgByName: new Map(result.rows.map((o) => [String(o.name).toLowerCase(), o.id])) };
    },
    transformRow: async (raw, ctx) => {
      let organization_id = pick(raw, 'organization_id', 'Organization ID');
      const orgName = pick(raw, 'organization_name', 'Organization Name', 'Organization');
      if (!organization_id && orgName) {
        organization_id = ctx.orgByName.get(String(orgName).toLowerCase());
        if (!organization_id) return { error: `Unknown organization: ${orgName}` };
      }
      const row = {
        organization_id,
        name: pick(raw, 'name', 'Name'),
        code: pick(raw, 'code', 'Code'),
        type: pick(raw, 'type', 'Type') || 'branch',
        email: pick(raw, 'email', 'Email') || '',
        primary_contact_code: pick(raw, 'primary_contact_code') || '+91',
        primary_contact_no: pick(raw, 'primary_contact_no', 'Primary Contact No'),
        notes: pick(raw, 'notes', 'Notes') || '',
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
        addresses: [],
      };
      const line1 = pick(raw, 'address_line1', 'Address Line 1');
      const city = pick(raw, 'city', 'City');
      const state = pick(raw, 'state', 'State');
      if (line1 || city || state) {
        row.addresses.push({
          address_type: 'branch',
          is_default: true,
          address_line1: line1 || '',
          address_line2: pick(raw, 'address_line2', 'Address Line 2') || '',
          city: city || '',
          state: state || '',
          pincode: pick(raw, 'pincode', 'Pincode') || '',
          country: pick(raw, 'country', 'Country') || 'India',
        });
      }
      if (!row.name || !row.code || !row.organization_id) {
        return { error: 'name, code, and organization (name or id) are required' };
      }
      return { row };
    },
  });
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, getDropdown, importRows };
