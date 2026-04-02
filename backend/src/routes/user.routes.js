const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('super_admin', 'admin'), create);
router.put('/:id', authorize('super_admin', 'admin'), update);
router.delete('/:id', authorize('super_admin'), remove);

module.exports = router;
