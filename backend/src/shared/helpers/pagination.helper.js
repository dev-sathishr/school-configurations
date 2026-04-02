const db = require('../../db');

/**
 * Build paginated query with search, filter, and sorting
 *
 * @param {Object} options
 * @param {string} options.table - Full table name (e.g. 'settings.users')
 * @param {string} options.alias - Table alias (e.g. 'u')
 * @param {string} options.selectFields - SELECT fields
 * @param {string} options.joins - JOIN clauses
 * @param {string[]} options.searchColumns - Columns to search with ILIKE
 * @param {Object} options.filters - { column: value } for exact match filters
 * @param {string} options.orderBy - ORDER BY column (default: 'created_at')
 * @param {Object} query - req.query params (page, size, search, order)
 * @returns {Promise<{ data: any[], pagination: Object }>}
 */
async function paginate(options, query = {}) {
  const {
    table,
    alias = 't',
    selectFields = `${alias}.*`,
    joins = '',
    searchColumns = [],
    filters = {},
    orderBy = `${alias}.created_at`,
  } = options;

  const page = Math.max(1, parseInt(query.page) || 1);
  const size = Math.min(100, Math.max(1, parseInt(query.size) || 10));
  const search = query.search || '';
  const order = query.order === 'oldest' ? 'ASC' : 'DESC';
  const offset = (page - 1) * size;

  const params = [];
  const conditions = [];

  // Search
  if (search && searchColumns.length > 0) {
    params.push(`%${search}%`);
    const idx = params.length;
    const searchClauses = searchColumns.map((col) => `${col} ILIKE $${idx}`);
    conditions.push(`(${searchClauses.join(' OR ')})`);
  }

  // Filters
  for (const [column, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'boolean') {
        conditions.push(`${column} = ${value}`);
      } else {
        params.push(value);
        conditions.push(`${column} = $${params.length}`);
      }
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
    `SELECT ${selectFields} FROM ${table} ${alias} ${joins} ${whereClause} ORDER BY ${orderBy} ${order} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
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
