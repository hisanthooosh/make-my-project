// File: backend/controllers/userController.js

const admin = require('firebase-admin');
// ... (all other imports are omitted for brevity, assume they are at the top)

// --- registerUser ---
const registerUser = async (req, res) => {
  try {
    const db = admin.firestore();
    const { uid, name, email, role, rollNumber, assignedMentorId, assignedClassId, designation, department } = req.body;
    const userData = { uid, name, email, role };

    // --- UPDATED BLOCK START ---
    if (role === 'student') {
      userData.rollNumber = rollNumber;
      userData.isPaid = false; // <--- ADDED: Default to unpaid for new students

      if (assignedMentorId) {
        userData.assignedMentorId = assignedMentorId;
      }
      if (assignedClassId) {
        userData.assignedClassId = assignedClassId;
      }
    }
    // --- UPDATED BLOCK END ---

    // Capture department/designation for Faculty/HOD users signing up
    if (role === 'faculty' || role === 'hod') {
      userData.designation = designation || "N/A";
      userData.department = department || "N/A";
    }
    if (role === 'hod') {
      userData.isApproved = true;
    }
    if (role === 'faculty') {
      userData.isApproved = false;
    }

    await db.collection('users').doc(uid).set(userData);
    res.status(201).json({ message: 'User registered successfully', user: userData });

  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({ message: 'Server error while registering user' });
  }
};
// --- getUserProfile ---
const getUserProfile = async (req, res) => {
  try {
    const db = admin.firestore();
    const userUid = req.user.uid;
    const userDoc = await db.collection('users').doc(userUid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found in Firestore' });
    }
    res.status(200).json(userDoc.data());
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// --- createFaculty ---
const createFaculty = async (req, res) => {
  try {
    const db = admin.firestore();
    const { name, email, password, designation, department } = req.body;

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    const facultyData = {
      uid: userRecord.uid,
      name: name,
      email: email,
      role: 'faculty',
      isApproved: true,
      // NEW: Save the extra details
      designation: designation,
      department: department
    };

    await db.collection('users').doc(userRecord.uid).set(facultyData);
    res.status(201).json({ message: 'Faculty account created successfully', user: facultyData });

  } catch (error) {
    console.error('Error creating faculty:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error while creating faculty' });
  }
};

// --- getMentors (from last step) ---
const getMentors = async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('users')
      .where('role', '==', 'faculty')
      .where('isApproved', '==', true)
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const mentors = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      mentors.push({
        uid: data.uid,
        name: data.name
      });
    });

    res.status(200).json(mentors);

  } catch (error) {
    console.error('Error in getMentors:', error);
    res.status(500).json({ message: 'Server error while fetching mentors' });
  }
};

// --- NEW FUNCTION: Get all classes (Public Read) ---
const getClassesPublic = async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('classes').get();

    const classes = [];
    snapshot.forEach(doc => {
      classes.push({
        id: doc.id, // We need the Firestore document ID here
        name: doc.data().name
      });
    });

    res.status(200).json(classes);

  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// --- Export all functions ---
module.exports = {
  registerUser,
  getUserProfile,
  createFaculty,
  getMentors,
  getClassesPublic // <-- ADD THIS NEW EXPORT
};