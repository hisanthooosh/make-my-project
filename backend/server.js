// File: backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const path = require('path'); // Import path module safely handling file paths

// --- CONFIGURATION ---
dotenv.config();

// Basic safety check for essential env vars
if (!process.env.FIREBASE_DATABASE_URL || !process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("FATAL ERROR: Missing essential environment variables.");
    process.exit(1);
}

// Import our routes
const userRoutes = require('./routes/userRoutes');
const hodRoutes = require('./routes/hodRoutes');
const projectRoutes = require('./routes/projectRoutes');
const facultyRoutes = require('./routes/facultyRoutes');


// --- 1. INITIALIZE FIREBASE ADMIN ---
// Using path.resolve ensures it finds the file relative to the server.js location correctly
const serviceAccountPath = path.resolve(__dirname, './firebase-service-account.json');
let serviceAccount;

try {
    serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('Firebase Admin connected successfully!');
} catch (error) {
    console.error('FAILED to connect to Firebase Admin:', error.message);
    console.error('Make sure firebase-service-account.json is in the backend root directory.');
    process.exit(1); // Exit if database connection fails
}


// --- 2. INITIALIZE CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Simple check to see if config loaded (doesn't verify connection to Cloudinary, but verifies env vars loaded)
if (cloudinary.config().cloud_name) {
    console.log('Cloudinary configuration loaded!');
}


// --- 3. INITIALIZE EXPRESS APP & MIDDLEWARE ---
const app = express();

// IMPORTANT: CORS Configuration
// In production, replace the array below with your actual frontend domain(s).
// e.g., origin: ['https://my-app.netlify.app', 'http://localhost:3000']
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow your frontend to access the backend
    credentials: true, // Allow cookies/authorization headers if needed
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware to parse JSON bodies (increase limit if uploading base64 images directly)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// --- 4. USE OUR API ROUTES ---

// CORRECTION: Changed base path from '/api/users/profile' to standard '/api/users'
// Routes in userRoutes.js will now be accessed via /api/users/profile, /api/users/update, etc.
app.use('/api/users', userRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/faculty', facultyRoutes);

// Basic Health Check Route
app.get('/', (req, res) => {
  res.status(200).send('Make My Report API is running healthy!');
});

// --- 5. 404 & GLOBAL ERROR HANDLING (Crucial for APIs) ---

// Handle 404 routes (if no other route matched above)
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

// Global Error Handler Middleware (Must be the last app.use)
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    console.error('Error Stack:', err.stack); // Log error stack for debugging on server

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Server Error',
        // Only show stack trace in development mode for security
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
});


// --- 6. START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n--- Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} ---`);
  console.log(`Local address: http://localhost:${PORT}`);
});