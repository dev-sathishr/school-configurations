/**
 * Extracts the active location ID from the X-Active-Location header
 * and attaches it to req.activeLocationId
 */
function extractLocation(req, res, next) {
  req.activeLocationId = req.headers['x-active-location'] || null;
  next();
}

module.exports = { extractLocation };
