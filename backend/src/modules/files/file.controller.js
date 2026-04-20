const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fileRepo = require('./file.repository');
const res = require('../../shared/helpers/response.helper');
const { wrap } = require('../../shared/middleware/async-handler');

// Multer storage config
const uploadsDir = path.join(__dirname, '../../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    cb(null, storedName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
});

async function uploadFile(req, resp) {
  const { entity_type, entity_id, file_type } = req.body;
  if (!entity_type || !entity_id || !file_type) {
    return res.badRequest(resp, 'entity_type, entity_id, and file_type are required');
  }
  if (!req.file) {
    return res.badRequest(resp, 'No file uploaded');
  }

  // For single-file types (logo, profile_image), soft delete old files
  const singleFileTypes = ['logo', 'profile_image', 'avatar'];
  if (singleFileTypes.includes(file_type)) {
    await fileRepo.softDeleteByEntity(entity_type, entity_id, file_type, req.user.id);
  }

  const fileData = {
    entity_type,
    entity_id,
    file_type,
    original_name: req.file.originalname,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    size: req.file.size,
    path: `uploads/${req.file.filename}`,
  };

  const file = await fileRepo.create(fileData, req.user.id);
  return res.created(resp, { file }, 'File uploaded successfully');
}

async function getFile(req, resp) {
  const file = await fileRepo.findById(req.params.id);
  if (!file) return res.notFound(resp, 'File not found');

  const filePath = path.join(__dirname, '../../../', file.path);
  if (!fs.existsSync(filePath)) return res.notFound(resp, 'File not found on disk');

  resp.setHeader('Content-Type', file.mime_type);
  resp.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
  fs.createReadStream(filePath).pipe(resp);
}

async function getEntityFiles(req, resp) {
  const { entity_type, entity_id } = req.params;
  const file_type = req.query.file_type;
  const files = await fileRepo.findByEntity(entity_type, entity_id, file_type);
  return res.success(resp, { files });
}

async function deleteFile(req, resp) {
  const file = await fileRepo.findById(req.params.id);
  if (!file) return res.notFound(resp, 'File not found');

  await fileRepo.softDelete(req.params.id, req.user.id);
  return res.success(resp, {}, 'File deleted successfully');
}

module.exports = { upload, ...wrap({ uploadFile, getFile, getEntityFiles, deleteFile }) };
