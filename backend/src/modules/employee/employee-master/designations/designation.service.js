const designationRepo = require('./designation.repository');
const employeeGroupRepo = require('../employee-groups/employee-group.repository');
const { bulkImport, pick, asBool } = require('../../../../shared/helpers/bulk-import.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../../shared/helpers/optimistic-lock.helper');

function mapDesignation(row) {
  if (!row) return row;
  const { employee_group_id, employee_group_name, employee_group_code, ...rest } = row;
  return {
    ...rest,
    employee_group: employee_group_id
      ? { id: employee_group_id, name: employee_group_name || '', code: employee_group_code || '' }
      : null,
  };
}

async function getAll(query, viewOwnUserId) {
  const result = await designationRepo.findAll(query, viewOwnUserId);
  result.data = (result.data || []).map(mapDesignation);
  return result;
}

async function getById(id) {
  const designation = await designationRepo.findById(id);
  if (!designation) return { error: 'notFound', message: 'Designation not found' };
  return { data: mapDesignation(designation) };
}

async function getDropdown(query) {
  return designationRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code, employee_group_id } = body;
  if (!name || !code || !employee_group_id) {
    return { error: 'badRequest', message: 'Employee group, name and code are required' };
  }

  const group = await employeeGroupRepo.findById(employee_group_id);
  if (!group || !group.is_active) {
    return { error: 'badRequest', message: 'Selected employee group is invalid or inactive' };
  }

  const existing = await designationRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Designation code already exists' };

  const designation = await designationRepo.create(body, userId);
  return getById(designation.id);
}

async function update(id, body, userId) {
  const current = await designationRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Designation not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  const employeeGroupId = body.employee_group_id || current.employee_group_id;
  if (!employeeGroupId) {
    return { error: 'badRequest', message: 'Employee group is required' };
  }

  const group = await employeeGroupRepo.findById(employeeGroupId);
  if (!group || !group.is_active) {
    return { error: 'badRequest', message: 'Selected employee group is invalid or inactive' };
  }

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await designationRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Designation code already exists' };
  }

  const designation = await designationRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(designation);
  if (stale) return stale;

  return getById(id);
}

async function remove(id, userId) {
  const current = await designationRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Designation not found' };
  await designationRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await designationRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function importRows(rows, userId) {
  return bulkImport({
    rows,
    create,
    userId,
    transformRow: async (raw) => {
      const row = {
        employee_group_id: pick(raw, 'employee_group_id', 'Employee Group ID'),
        name: pick(raw, 'name', 'Name'),
        code: pick(raw, 'code', 'Code'),
        description: pick(raw, 'description', 'Description') || '',
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
      };
      if (!row.employee_group_id || !row.name || !row.code) {
        return { error: 'employee group id, name and code are required' };
      }
      return { row };
    },
  });
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows };
