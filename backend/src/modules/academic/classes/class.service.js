const classRepo = require('./class.repository');
const { validate } = require('../../../shared/helpers/validate.helper');
const { bulkImport, pick, asBool } = require('../../../shared/helpers/bulk-import.helper');

const CLASS_RULES = {
  name: { required: true, min: 2, max: 200, label: 'Name' },
  code: { max: 50, label: 'Code' },
  academic_level: { required: true, label: 'Academic Level' },
  notes: { max: 500, label: 'Notes' },
};

async function getAll(query) {
  return classRepo.findAll(query);
}

async function getById(id) {
  const classGeneral = await classRepo.findById(id);
  if (!classGeneral) return { error: 'notFound', message: 'Class not found' };
  return { data: classGeneral };
}

async function create(body, userId) {
  const errors = validate(body, CLASS_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.name) {
    const exists = await classRepo.checkUnique('name', body.name);
    if (exists) return { error: 'conflict', message: 'Class name already exists' };
  }
  if (body.code) {
    const exists = await classRepo.checkUnique('code', body.code);
    if (exists) return { error: 'conflict', message: 'Class code already exists' };
  }

  const classGeneral = await classRepo.create(body, userId);
  return { data: classGeneral };
}

async function update(id, body, userId) {
  const current = await classRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Class not found' };

  const merged = { ...current, ...body };
  const errors = validate(merged, CLASS_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.name && body.name.trim().toLowerCase() !== current.name?.toLowerCase()) {
    const exists = await classRepo.checkUnique('name', body.name, id);
    if (exists) return { error: 'conflict', message: 'Class name already exists' };
  }
  if (body.code && body.code.trim().toLowerCase() !== current.code?.toLowerCase()) {
    const exists = await classRepo.checkUnique('code', body.code, id);
    if (exists) return { error: 'conflict', message: 'Class code already exists' };
  }

  const classGeneral = await classRepo.update(id, body, current, userId);
  return { data: classGeneral };
}

async function remove(id, userId) {
  const current = await classRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Class not found' };
  await classRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await classRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function getDropdown(query) {
  const page = parseInt(query.page) || 1;
  const size = parseInt(query.size) || 20;
  const search = (query.search || '').trim();
  return classRepo.findDropdown({ page, size, search });
}

async function importRows(rows, userId) {
  return bulkImport({
    rows, create, userId,
    transformRow: async (raw) => {
      const row = {
        name: pick(raw, 'name', 'Name'),
        code: pick(raw, 'code', 'Code') || '',
        academic_level: pick(raw, 'academic_level', 'Academic Level'),
        strength: Number(pick(raw, 'strength', 'Strength')) || 0,
        notes: pick(raw, 'notes', 'Notes') || '',
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
      };
      if (!row.name || !row.academic_level) return { error: 'name and academic_level are required' };
      return { row };
    },
  });
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, getDropdown, importRows };
