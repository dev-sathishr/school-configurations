const MAX_ROWS = 1000;

/**
 * Generic "run a file worth of create() calls" loop used by every module's
 * POST /import route.
 *
 * @param {Object} params
 * @param {Array<Record<string, unknown>>} params.rows   Parsed rows from the uploaded file
 * @param {Function} params.transformRow                 async(raw, context) -> { row } | { error }
 * @param {Function} params.create                       the module's create(body, userId) service fn
 * @param {string}   params.userId
 * @param {Function} [params.preResolve]                 async(rows) -> context object passed to each transformRow
 * @returns {Promise<{success_count, error_count, errors}|{error, message}>}
 */
async function bulkImport({ rows, transformRow, create, userId, preResolve }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: 'badRequest', message: 'rows array is required' };
  }
  if (rows.length > MAX_ROWS) {
    return { error: 'badRequest', message: `Too many rows (max ${MAX_ROWS} per import)` };
  }

  const context = preResolve ? await preResolve(rows) : {};

  let successCount = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i] || {};
    // +2 = skip zero-indexing and the file's header row
    const rowNumber = i + 2;
    try {
      const transformed = await transformRow(raw, context);
      if (transformed.error) {
        errors.push({ row: rowNumber, message: transformed.error });
        continue;
      }
      const result = await create(transformed.row, userId);
      if (result && result.error) {
        errors.push({ row: rowNumber, message: result.message });
      } else {
        successCount++;
      }
    } catch (err) {
      let message = err.message || 'Unknown error';
      if (err.code === '23505') message = 'Duplicate value (unique constraint)';
      else if (err.code === '23503') message = 'Referenced record not found';
      errors.push({ row: rowNumber, message });
    }
  }

  return { success_count: successCount, error_count: errors.length, errors };
}

/** Pick the first non-empty value from the row by trying each alias in order. */
function pick(raw, ...aliases) {
  for (const key of aliases) {
    const v = raw[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

/** Parse a boolean-ish value; defaults to true when undefined. */
function asBool(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase().trim();
  return !(s === 'false' || s === '0' || s === 'no' || s === 'n');
}

module.exports = { bulkImport, pick, asBool, MAX_ROWS };
