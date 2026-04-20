function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, ...data });
}

function created(res, data, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function error(res, message = 'Internal server error', statusCode = 500) {
  return res.status(statusCode).json({ success: false, message });
}

function badRequest(res, message = 'Bad request') {
  return error(res, message, 400);
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

function notFound(res, message = 'Not found') {
  return error(res, message, 404);
}

function conflict(res, message = 'Conflict') {
  return error(res, message, 409);
}

/**
 * Maps a service's `{ error, message }` failure shape to the right HTTP
 * response. Returns `null` when there is no error so callers can do:
 *
 *   if (result.error) return handleError(resp, result);
 *   return res.success(resp, { data: result.data });
 *
 * Falls through to a generic 400 if the service invents a new error code so
 * new shapes fail loudly rather than leaking 500s.
 */
function handleError(res, result) {
  if (!result || !result.error) return null;
  const map = { notFound, badRequest, conflict, forbidden, unauthorized };
  const fn = map[result.error] || badRequest;
  return fn(res, result.message);
}

module.exports = { success, created, error, badRequest, unauthorized, forbidden, notFound, conflict, handleError };
