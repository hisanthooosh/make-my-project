// File: backend/routes/userRoutes.js

const express = require('express');
const router = express.Router();

const { 
  registerUser, 
  getUserProfile,
  createFaculty,
  getMentors,
  getClassesPublic // <-- Import new function
} = require('../controllers/userController');

const { requireAuth, hodCheck } = require('../middleware/authMiddleware');

// --- Public Routes ---
router.post('/register', registerUser);
router.get('/mentors', getMentors);
router.get('/classes', getClassesPublic); // <-- ADD THIS NEW PUBLIC ROUTE

// --- Private Routes (Logged-in users) ---
router.get('/profile', requireAuth, (req, res) => {
  res.status(200).json(req.user);
});

// --- Admin Routes (HOD Only) ---
router.post('/create-faculty', requireAuth, hodCheck, createFaculty);

module.exports = router;