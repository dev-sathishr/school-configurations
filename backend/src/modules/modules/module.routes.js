const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, getDropdown } = require('./module.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const { ADMIN_ROLES, ROLES } = require('../../shared/constants/roles');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize(...ADMIN_ROLES), create);
router.put('/:id', authorize(...ADMIN_ROLES), update);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), remove);

module.exports = router;
