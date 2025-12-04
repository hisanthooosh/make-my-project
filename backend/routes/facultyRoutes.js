// File: backend/routes/facultyRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, facultyCheck } = require('../middleware/authMiddleware');

// Import our new controller functions
const {
  getMyStudents,
  getStudentProject,
  submitReview
} = require('../controllers/facultyController');

// All routes in this file are for Faculty only
router.use(requireAuth, facultyCheck);

// GET route to fetch all students assigned to this mentor
router.get('/my-students', getMyStudents);

// GET route to fetch a single student's project
router.get('/student-project/:studentId', getStudentProject);

// POST route to submit a review for a section
router.post('/review-section', submitReview);

module.exports = router;