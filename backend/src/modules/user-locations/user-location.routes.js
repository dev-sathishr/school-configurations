const express = require('express');
const router = express.Router();
const { getMyLocations, getUserLocations, setUserLocations, switchDefaultLocation } = require('./user-location.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const { ADMIN_ROLES } = require('../../shared/constants/roles');

router.use(authenticate);

// Current user's locations
router.get('/my', getMyLocations);
router.patch('/my/switch', switchDefaultLocation);

// Admin: manage user locations
router.get('/user/:userId', authorize(...ADMIN_ROLES), getUserLocations);
router.put('/user/:userId', authorize(...ADMIN_ROLES), setUserLocations);

module.exports = router;
