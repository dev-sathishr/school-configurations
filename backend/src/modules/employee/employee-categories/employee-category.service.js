const employeeCategoryRepo = require('./employee-category.repository');
const { bulkImport, pick, asBool } = require('../../../shared/helpers/bulk-import.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

async function getAll(query, viewOwnUserId) {
  return employeeCategoryRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const employeeCategory = await employeeCategoryRepo.findById(id);
  if (!employeeCategory) return { error: 'notFound', message: 'Employee category not found' };
  return { data: employeeCategory };
}

async function getDropdown(query) {
  return employeeCategoryRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await employeeCategoryRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Employee category code already exists' };

  const employeeCategory = await employeeCategoryRepo.create(body, userId);
  return getById(employeeCategory.id);
}

async function update(id, body, userId) {
  const current = await employeeCategoryRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Employee category not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await employeeCategoryRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Employee category code already exists' };
  }

  const employeeCategory = await employeeCategoryRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(employeeCategory);
  if (stale) return stale;

  return getById(id);
}

async function remove(id, userId) {
  const current = await employeeCategoryRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Employee category not found' };
  if (current.employee_group_count > 0) {
    return { error: 'conflict', message: `Cannot delete "${current.name}" — it has ${current.employee_group_count} employee group(s) mapped to it. Remove the groups first.` };
  }
  await employeeCategoryRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const blocked = [];
  for (const id of ids) {
    const current = await employeeCategoryRepo.findById(id);
    if (current && current.employee_group_count > 0) blocked.push(`"${current.name}" (${current.employee_group_count} group(s))`);
  }
  if (blocked.length) return { error: 'conflict', message: `Cannot delete: ${blocked.join(', ')}. Remove their employee groups first.` };
  const deletedCount = await employeeCategoryRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function importRows(rows, userId) {
  return bulkImport({
    rows,
    create,
    userId,
    transformRow: async (raw) => {
      const row = {
        name: pick(raw, 'name', 'Name'),
        code: pick(raw, 'code', 'Code'),
        description: pick(raw, 'description', 'Description') || '',
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
      };
      if (!row.name || !row.code) return { error: 'name and code are required' };
      return { row };
    },
  });
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows };
