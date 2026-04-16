const express = require('express');
const router = express.Router();
const { upload, uploadFile, getFile, getEntityFiles, deleteFile } = require('./file.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { verifyAccessToken } = require('../../shared/helpers/jwt.helper');

// Serve files — accepts token from header OR query param (for <img src> tags)
router.get('/:id', (req, res, next) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : queryToken;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}, getFile);

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/entity/:entity_type/:entity_id', getEntityFiles);
router.delete('/:id', deleteFile);

module.exports = router;
