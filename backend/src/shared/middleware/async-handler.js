/**
 * Wraps async Express handlers so a thrown or rejected error is forwarded to
 * the global error middleware instead of becoming an unhandled promise.
 *
 * Usage (per handler):
 *   router.get('/', asyncHandler(getAll));
 *
 * Usage (per controller export) — saves wrapping every route:
 *   module.exports = wrap({ getAll, getById, create, ... });
 *
 * Business-level errors (service returns `{ error: 'notFound', message }`) are
 * still handled inline by controllers via `handleError`. `asyncHandler` only
 * catches unexpected throws (DB failures, programming bugs, etc.).
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function wrap(handlers) {
  const wrapped = {};
  for (const key of Object.keys(handlers)) {
    const val = handlers[key];
    wrapped[key] = typeof val === 'function' ? asyncHandler(val) : val;
  }
  return wrapped;
}

module.exports = { asyncHandler, wrap };
