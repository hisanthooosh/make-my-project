// File: backend/routes/hodRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, hodCheck } = require('../middleware/authMiddleware');

// Import from hodController
const {
  getDashboardStats,
  getStudentProjectForHod,
  createClass,
  deleteStudent // <--- 1. Import this
} = require('../controllers/hodController');

// Import from userController
const { createFaculty } = require('../controllers/userController');

// All routes in this file are for HOD only
router.use(requireAuth, hodCheck);

// --- NEW HOD DASHBOARD ROUTES ---

// GET route for all dashboard data
router.get('/dashboard-stats', getDashboardStats);

// POST route to create a new faculty member
router.post('/create-faculty', createFaculty);

// POST route to create a new class
router.post('/create-class', createClass);

// GET route to fetch a single student's project for preview
router.get('/student-project/:studentId', getStudentProjectForHod);
// --- ADD THIS NEW ROUTE ---
// DELETE route to remove a student
router.delete('/delete-student/:studentId', deleteStudent);

module.exports = router;