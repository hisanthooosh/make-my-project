// File: backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

// Import our routes
const userRoutes = require('./routes/userRoutes');
const hodRoutes = require('./routes/hodRoutes');
const projectRoutes = require('./routes/projectRoutes');
const facultyRoutes = require('./routes/facultyRoutes');

dotenv.config();

// --- 1. INITIALIZE FIREBASE ADMIN ---
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});
console.log('Firebase Admin connected!');

// --- 2. INITIALIZE CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log('Cloudinary connected!');

// --- 3. INITIALIZE EXPRESS APP ---
const app = express();
app.use(cors());
app.use(express.json());

// --- 4. USE OUR API ROUTES ---
app.use('/api/users', userRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/faculty', facultyRoutes);

app.get('/', (req, res) => {
  res.send('Make My Report API is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});