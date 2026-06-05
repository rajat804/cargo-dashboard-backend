const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  getFileUrl
} = require('../controllers/fileController');

router.post('/upload', upload.single('file'), uploadFile);
router.post('/upload-multiple', upload.array('files', 10), uploadMultipleFiles);
router.delete('/:publicId', deleteFile);
router.get('/:publicId', getFileUrl);

module.exports = router;