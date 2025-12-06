// File: backend/middleware/authMiddleware.js
const admin = require('firebase-admin');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Error verifying auth token:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};
const getUserProfile = async (req, res, next) => {
  try {
    const db = admin.firestore();
    // 1. Use the UID from the token to find the doc
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (userDoc.exists) {
      // 2. FIX: Merge the database data WITH the UID
      // This ensures req.user.uid exists for the next controller
      req.user = { 
        ...userDoc.data(), 
        uid: userDoc.id 
      };
      next();
    } else {
      res.status(404).json({ message: 'User profile not found in Firestore' });
    }
  } catch (error) {
    console.error('Error in getUserProfile middleware:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

const hodCheck = (req, res, next) => {
  if (req.user && req.user.role === 'hod') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized, HOD access only' });
  }
};

const facultyCheck = (req, res, next) => {
  if (req.user && req.user.role === 'faculty') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized, Faculty access only' });
  }
};

const studentCheck = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized, Student access only' });
  }
};

const requireAuth = [protect, getUserProfile];

module.exports = {
  requireAuth,
  hodCheck,
  facultyCheck,
  studentCheck
};