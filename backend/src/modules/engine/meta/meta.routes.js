const express = require('express');
const router = express.Router();
const ctrl = require('./meta.controller');
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown',               ctrl.getDropdown);
router.get('/',                       authorizeModule('ENGINE_META', 'VIEW'),   ctrl.getAll);
router.get('/:slug',                  authorizeModule('ENGINE_META', 'VIEW'),   ctrl.getBySlug);
router.post('/',                      authorizeModule('ENGINE_META', 'CREATE'), ctrl.create);
router.put('/:slug',                  authorizeModule('ENGINE_META', 'EDIT'),   ctrl.update);
router.delete('/:slug',               authorizeModule('ENGINE_META', 'DELETE'), ctrl.remove);
router.post('/:slug/fields',          authorizeModule('ENGINE_META', 'EDIT'),   ctrl.upsertFields);
router.delete('/:slug/fields/:fieldId', authorizeModule('ENGINE_META', 'EDIT'), ctrl.removeField);

module.exports = router;
