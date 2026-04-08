const service = require('./user-location.service');
const res = require('../../shared/helpers/response.helper');

async function getMyLocations(req, resp) {
  try {
    const locations = await service.getUserLocations(req.user.id);
    return res.success(resp, { data: locations });
  } catch (err) {
    console.error('Get my locations error:', err);
    return res.error(resp);
  }
}

async function getUserLocations(req, resp) {
  try {
    const locations = await service.getUserLocations(req.params.userId);
    return res.success(resp, { data: locations });
  } catch (err) {
    console.error('Get user locations error:', err);
    return res.error(resp);
  }
}

async function setUserLocations(req, resp) {
  try {
    const locations = await service.setUserLocations(req.params.userId, req.body.locations, req.user.id);
    return res.success(resp, { data: locations }, 'Locations updated');
  } catch (err) {
    if (err.type === 'validation') return res.badRequest(resp, err.message);
    console.error('Set user locations error:', err);
    return res.error(resp);
  }
}

async function switchDefaultLocation(req, resp) {
  try {
    await service.switchDefaultLocation(req.user.id, req.body.location_id);
    return res.success(resp, {}, 'Default location updated');
  } catch (err) {
    if (err.type === 'forbidden') return res.forbidden(resp, err.message);
    console.error('Switch location error:', err);
    return res.error(resp);
  }
}

module.exports = { getMyLocations, getUserLocations, setUserLocations, switchDefaultLocation };
