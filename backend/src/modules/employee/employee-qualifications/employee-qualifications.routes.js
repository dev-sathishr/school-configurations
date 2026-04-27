const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');
const { getAll, getById, create, update, remove } = require('./employee-qualifications.controller');

router.use(authenticate);

router.get('/',                          authorizeModule('EMPLOYEE_INFO', 'VIEW'),   getAll);
router.get('/:qualificationId',          authorizeModule('EMPLOYEE_INFO', 'VIEW'),   getById);
router.post('/',                         authorizeModule('EMPLOYEE_INFO', 'EDIT'),   create);
router.put('/:qualificationId',          authorizeModule('EMPLOYEE_INFO', 'EDIT'),   update);
router.delete('/:qualificationId',       authorizeModule('EMPLOYEE_INFO', 'EDIT'),   remove);

module.exports = router;
