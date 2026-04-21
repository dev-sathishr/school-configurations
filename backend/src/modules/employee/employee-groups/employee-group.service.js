const employeeGroupRepo = require('./employee-group.repository');
const employeeCategoryRepo = require('../employee-categories/employee-category.repository');
const { bulkImport, pick, asBool } = require('../../../shared/helpers/bulk-import.helper');

async function getAll(query, viewOwnUserId) {
  return employeeGroupRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const employeeGroup = await employeeGroupRepo.findById(id);
  if (!employeeGroup) return { error: 'notFound', message: 'Employee group not found' };
  return { data: employeeGroup };
}

async function getDropdown(query) {
  return employeeGroupRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code, employee_category_id } = body;
  if (!name || !code || !employee_category_id) {
    return { error: 'badRequest', message: 'Employee category, name and code are required' };
  }

  const category = await employeeCategoryRepo.findById(employee_category_id);
  if (!category || !category.is_active) {
    return { error: 'badRequest', message: 'Selected employee category is invalid or inactive' };
  }

  const existing = await employeeGroupRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Employee group code already exists' };

  const employeeGroup = await employeeGroupRepo.create(body, userId);
  return { data: employeeGroup };
}

async function update(id, body, userId) {
  const current = await employeeGroupRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Employee group not found' };

  const employeeCategoryId = body.employee_category_id || current.employee_category_id;
  if (!employeeCategoryId) {
    return { error: 'badRequest', message: 'Employee category is required' };
  }

  const category = await employeeCategoryRepo.findById(employeeCategoryId);
  if (!category || !category.is_active) {
    return { error: 'badRequest', message: 'Selected employee category is invalid or inactive' };
  }

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await employeeGroupRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Employee group code already exists' };
  }

  const employeeGroup = await employeeGroupRepo.update(id, body, current, userId);
  return { data: employeeGroup };
}

async function remove(id, userId) {
  const current = await employeeGroupRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Employee group not found' };
  await employeeGroupRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await employeeGroupRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function importRows(rows, userId) {
  return bulkImport({
    rows,
    create,
    userId,
    transformRow: async (raw) => {
      const row = {
        employee_category_id: pick(raw, 'employee_category_id', 'Employee Category ID'),
        name: pick(raw, 'name', 'Name'),
        code: pick(raw, 'code', 'Code'),
        description: pick(raw, 'description', 'Description') || '',
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
      };
      if (!row.employee_category_id || !row.name || !row.code) {
        return { error: 'employee category id, name and code are required' };
      }
      return { row };
    },
  });
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows };
