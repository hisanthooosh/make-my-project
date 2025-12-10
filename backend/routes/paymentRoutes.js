const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { requireAuth, studentCheck } = require('../middleware/authMiddleware');

// Only logged-in students can access these routes
router.post('/create-order', requireAuth, studentCheck, createOrder);
router.post('/verify', requireAuth, studentCheck, verifyPayment);

module.exports = router;