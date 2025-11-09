// File: backend/middleware/uploadMiddleware.js

const multer = require('multer');

// We will store the files in memory (as a 'buffer')
const storage = multer.memoryStorage();

// Set up multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit per image
  },
});

module.exports = upload;