const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple, importRows } = require('./menu-module.controller');
const { authenticate, authorize } = require('../../../shared/middleware/auth.middleware');
const { ADMIN_ROLES, ROLES } = require('../../../shared/constants/roles');

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize(...ADMIN_ROLES), create);
router.post('/import', authorize(...ADMIN_ROLES), importRows);
router.post('/delete-multiple', authorize(ROLES.SUPER_ADMIN), removeMultiple);
router.put('/:id', authorize(...ADMIN_ROLES), update);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), remove);

module.exports = router;
