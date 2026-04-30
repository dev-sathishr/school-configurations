const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple } = require('./student-profile.controller');
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');

const uploadsDir = path.join(__dirname, '../../../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdirSync(uploadsDir, { recursive: true }); cb(null, uploadsDir); },
  filename:    (req, file, cb) => { cb(null, `${uuidv4()}${path.extname(file.originalname)}`); },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorizeModule('ADMISSION_MANAGEMENT', 'CREATE'), upload.single('photo'), create);
router.post('/delete-multiple', authorizeModule('ADMISSION_MANAGEMENT', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('ADMISSION_MANAGEMENT', 'EDIT'), upload.single('photo'), update);
router.delete('/:id', authorizeModule('ADMISSION_MANAGEMENT', 'DELETE'), remove);

module.exports = router;
