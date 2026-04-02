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

module.exports = { success, created, error, badRequest, unauthorized, forbidden, notFound, conflict };
