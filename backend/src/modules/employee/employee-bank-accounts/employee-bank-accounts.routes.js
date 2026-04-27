const express = require('express');
const router = express.Router({ mergeParams: true });
const ifscRouter = express.Router();
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');
const { getAll, getById, save, remove, setActive, lookupIfsc } = require('./employee-bank-accounts.controller');

router.use(authenticate);

router.get('/',                          authorizeModule('EMPLOYEE_INFO', 'VIEW'),   getAll);
router.get('/:bankAccountId',            authorizeModule('EMPLOYEE_INFO', 'VIEW'),   getById);
router.post('/',                         authorizeModule('EMPLOYEE_INFO', 'EDIT'),   save);
router.delete('/:bankAccountId',         authorizeModule('EMPLOYEE_INFO', 'EDIT'),   remove);
router.patch('/:bankAccountId/activate', authorizeModule('EMPLOYEE_INFO', 'EDIT'),   setActive);

// IFSC lookup — authenticated but no module permission required (read-only external data)
ifscRouter.use(authenticate);
ifscRouter.get('/:ifsc', lookupIfsc);

module.exports = { router, ifscRouter };
