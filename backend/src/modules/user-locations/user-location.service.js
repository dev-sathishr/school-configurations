const repository = require('./user-location.repository');

async function getUserLocations(userId) {
  const rows = await repository.findByUserId(userId);
  return rows.map((row) => ({
    location_id: row.location_id,
    name: row.name,
    code: row.code,
    type: row.type,
    is_default: row.is_default,
    organization: { id: row.org_id, name: row.org_name },
  }));
}

async function setUserLocations(userId, locations, createdBy) {
  if (!locations || !Array.isArray(locations) || locations.length === 0) {
    throw { type: 'validation', message: 'At least one location is required' };
  }

  // Ensure exactly one default
  const defaults = locations.filter((l) => l.is_default);
  if (defaults.length === 0) locations[0].is_default = true;
  if (defaults.length > 1) {
    locations.forEach((l) => (l.is_default = false));
    locations[0].is_default = true;
  }

  await repository.setLocations(userId, locations, createdBy);
  return getUserLocations(userId);
}

async function switchDefaultLocation(userId, locationId) {
  const hasAccess = await repository.hasAccess(userId, locationId);
  if (!hasAccess) {
    throw { type: 'forbidden', message: 'You do not have access to this location' };
  }
  await repository.setDefaultLocation(userId, locationId);
}

module.exports = { getUserLocations, setUserLocations, switchDefaultLocation };
