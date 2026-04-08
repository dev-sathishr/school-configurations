const db = require('../../config/database');

/**
 * Build paginated query with search, column filters, and column sorting
 *
 * @param {Object} options
 * @param {string} options.table - Full table name (e.g. 'settings.users')
 * @param {string} options.alias - Table alias (e.g. 'u')
 * @param {string} options.selectFields - SELECT fields
 * @param {string} options.joins - JOIN clauses
 * @param {string[]} options.searchColumns - Columns for global ILIKE search
 * @param {string[]} options.filterableColumns - Columns allowed for per-column filters
 * @param {string[]} options.sortableColumns - Columns allowed for sorting
 * @param {string} options.defaultSortBy - Default sort column
 * @param {string} options.defaultSortOrder - Default sort order ('ASC' or 'DESC')
 * @param {Object} query - req.query params
 * @returns {Promise<{ data: any[], pagination: Object }>}
 */
async function paginate(options, query = {}) {
  const {
    table,
    alias = 't',
    selectFields = `${alias}.*`,
    joins = '',
    searchColumns = [],
    filterableColumns = [],
    sortableColumns = [],
    defaultSortBy = `${alias}.created_at`,
    defaultSortOrder = 'DESC',
    baseCondition = `${alias}.deleted_at IS NULL`,
  } = options;

  const page = Math.max(1, parseInt(query.page) || 1);
  const size = Math.min(100, Math.max(1, parseInt(query.size) || 10));
  const search = query.search || '';
  const offset = (page - 1) * size;

  // Sorting
  let sortBy = defaultSortBy;
  let sortOrder = defaultSortOrder;

  if (query.sort_by && sortableColumns.includes(query.sort_by)) {
    sortBy = query.sort_by;
  }
  if (query.sort_order === 'asc' || query.sort_order === 'desc') {
    sortOrder = query.sort_order.toUpperCase();
  } else if (query.order === 'oldest') {
    sortOrder = 'ASC';
  }

  const params = [];
  const conditions = [];

  // Exclude soft-deleted rows
  if (baseCondition) {
    conditions.push(baseCondition);
  }

  // Global search
  if (search && searchColumns.length > 0) {
    params.push(`%${search}%`);
    const idx = params.length;
    const searchClauses = searchColumns.map((col) => `${col} ILIKE $${idx}`);
    conditions.push(`(${searchClauses.join(' OR ')})`);
  }

  // Per-column filters (query.filter[column]=value)
  const columnFilters = query.filter || {};
  for (const [column, value] of Object.entries(columnFilters)) {
    if (value === undefined || value === null || value === '') continue;
    if (!filterableColumns.includes(column)) continue;

    if (value === 'true') {
      conditions.push(`${column} = true`);
    } else if (value === 'false') {
      conditions.push(`${column} = false`);
    } else {
      params.push(`%${value}%`);
      conditions.push(`${column} ILIKE $${params.length}`);
    }
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM ${table} ${alias} ${joins} ${whereClause}`,
    params
  );
  const totalCount = parseInt(countResult.rows[0].count);

  // Data
  params.push(size);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const result = await db.query(
    `SELECT ${selectFields} FROM ${table} ${alias} ${joins} ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return {
    data: result.rows,
    pagination: {
      page,
      size,
      total_count: totalCount,
      total_pages: Math.ceil(totalCount / size),
    },
  };
}

module.exports = { paginate };
