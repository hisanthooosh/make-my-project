// File: backend/routes/projectRoutes.js
const express = require('express');
const router = express.Router();

// Import our new controller functions
const { 
  updateProjectSection, 
  getMyProject,
  uploadProjectImages
} = require('../controllers/projectController');

const { requireAuth, studentCheck } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All routes in this file are for Students only
router.use(requireAuth, studentCheck);

// Route to get the student's entire project
router.get('/my-project', getMyProject);

// Route to update a single text section
// This now handles both "Save" (status: 'draft') and "Submit" (status: 'pending')
router.post('/update-section', updateProjectSection);

// Route to upload images
router.post(
  '/upload-images',
  upload.array('images', 10),
  uploadProjectImages
);

module.exports = router;