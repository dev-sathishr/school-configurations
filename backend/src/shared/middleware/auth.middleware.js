const { verifyAccessToken } = require('../helpers/jwt.helper');
const { unauthorized, forbidden } = require('../helpers/response.helper');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
}

function authorize(...groupCodes) {
  return (req, res, next) => {
    if (!groupCodes.includes(req.user.group_code)) {
      return forbidden(res, 'Insufficient permissions');
    }
    next();
  };
}

module.exports = { authenticate, authorize };
