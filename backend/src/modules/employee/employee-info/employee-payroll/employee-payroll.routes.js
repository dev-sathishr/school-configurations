const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :employeeId
const { authenticate, authorizeModule } = require('../../../../shared/middleware/auth.middleware');
const { getAll, getById, create, update, remove, addRejoin } = require('./employee-payroll.controller');

router.use(authenticate);

router.get('/',              authorizeModule('EMPLOYEE_INFO', 'VIEW'),   getAll);
router.get('/:id',           authorizeModule('EMPLOYEE_INFO', 'VIEW'),   getById);
router.post('/',             authorizeModule('EMPLOYEE_INFO', 'CREATE'), create);
router.post('/rejoin',       authorizeModule('EMPLOYEE_INFO', 'CREATE'), addRejoin);
router.put('/:id',           authorizeModule('EMPLOYEE_INFO', 'EDIT'),   update);
router.delete('/:id',        authorizeModule('EMPLOYEE_INFO', 'DELETE'), remove);

module.exports = router;
