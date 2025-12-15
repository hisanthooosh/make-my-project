// File: backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const path = require('path'); 

// --- CONFIGURATION ---
dotenv.config();

// Basic safety check for essential env vars
if (!process.env.FIREBASE_DATABASE_URL) {
    console.error("FATAL ERROR: Missing FIREBASE_DATABASE_URL in environment variables.");
    process.exit(1);
}

// Import our routes
const userRoutes = require('./routes/userRoutes');
const hodRoutes = require('./routes/hodRoutes');
const projectRoutes = require('./routes/projectRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');


// --- 1. INITIALIZE FIREBASE ADMIN ---
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
    process.exit(1); 
}


// --- 2. INITIALIZE CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// --- 3. INITIALIZE EXPRESS APP & MIDDLEWARE ---
const app = express();

const corsOptions = {
    origin: process.env.FRONTEND_URL || '*', // Allow access
    credentials: true, 
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// --- 4. USE OUR API ROUTES (API COMES FIRST) ---
app.use('/api/users', userRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/payment', paymentRoutes);

// Health check for API specifically
app.get('/api/health', (req, res) => {
  res.status(200).send('Make My Report API is running healthy!');
});


// --- 5. SERVE FRONTEND (WEBSITE COMES LAST) ---

// Step A: Serve the static files (CSS, JS, Images) from the 'build' folder
// NOTE: Ensure your 'build' folder is physically inside 'backend'
app.use(express.static(path.join(__dirname, 'build')));

// Step B: The Catch-All Route
// If the request didn't match any API route above, send the React App (index.html)
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


// --- 6. GLOBAL ERROR HANDLING ---
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    console.error('Error Stack:', err.stack); 

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Server Error',
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
});


// --- 7. START SERVER ---
const PORT = process.env.PORT || 8080; // Default to 8080 for Azure
app.listen(PORT, () => {
  console.log(`\n--- Server running on port ${PORT} ---`);
});