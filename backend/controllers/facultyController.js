// File: backend/controllers/facultyController.js
const admin = require('firebase-admin');

// --- Helper: Calculate Progress ---
const calculateStats = (project) => {
  if (!project || !project.sections) return { progress: 0, status: 'Not Started' };

  // Must match your Frontend Report Structure
  const allSectionIds = [
    'titlePage', 'certificate', 'certificateScan', 'acknowledgement',
    'abstract', 'orgInfo', 'methodologies', 'benefits', 'toc',
    'weeklyOverview', 'intro_main', 'intro_modules',
    'systemAnalysis', 'srs', 'technology', 'coding',
    'screenshots', 'conclusion', 'bibliography'
  ];

  let approved = 0;
  const total = allSectionIds.length;

  allSectionIds.forEach(id => {
    if (project.sections[id]?.status === 'approved') approved++;
  });

  const progress = total > 0 ? Math.round((approved / total) * 100) : 0;
  
  let status = 'Pending';
  if (progress === 0) status = 'Not Started';
  if (progress === 100) status = 'Completed';

  return { progress, status };
};
// @desc    Get all students with Progress Stats
// @route   GET /api/faculty/my-students
// @access  Private (Faculty Only)
const getMyStudents = async (req, res) => {
  try {
    const db = admin.firestore();
    const facultyUid = req.user.uid;

    // 1. Get Students
    const studentsQuery = await db.collection('users')
      .where('role', '==', 'student')
      .where('assignedMentorId', '==', facultyUid)
      .get();

    if (studentsQuery.empty) return res.status(200).json([]);

    const students = studentsQuery.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

    // 2. Get All Projects for these students (Efficient Query)
    const projectsQuery = await db.collection('projects')
      .where('mentorUid', '==', facultyUid)
      .get();

    const projectsMap = {};
    projectsQuery.forEach(doc => {
      projectsMap[doc.data().studentUid] = doc.data();
    });

    // 3. Merge Data with Stats
    const studentsWithStats = students.map(student => {
      const project = projectsMap[student.uid];
      const stats = calculateStats(project);
      
      return {
        uid: student.uid,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        progress: stats.progress,
        overallStatus: stats.status // 'Completed', 'Pending', 'Not Started'
      };
    });

    res.status(200).json(studentsWithStats);
  } catch (error) {
    console.error('Error in getMyStudents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a single student's project for review
// @route   GET /api/faculty/student-project/:studentId
// @access  Private (Faculty Only)
const getStudentProject = async (req, res) => {
  try {
    const db = admin.firestore();
    const facultyUid = req.user.uid;
    const { studentId } = req.params;

    // Get the project for the specific student
    const projectQuery = await db.collection('projects')
      .where('studentUid', '==', studentId)
      .limit(1)
      .get();

    if (projectQuery.empty) {
      return res.status(404).json({ message: 'No project found for this student.' });
    }

    const project = projectQuery.docs[0].data();
    const projectId = projectQuery.docs[0].id;

    // --- SECURITY CHECK ---
    // Ensure the faculty is actually this student's mentor
    if (project.mentorUid !== facultyUid) {
      return res.status(403).json({ message: 'Not authorized to view this project.' });
    }

    // Add the document ID to the project object
    project.id = projectId;
    res.status(200).json(project);

  } catch (error) {
    console.error('Error in getStudentProject:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve or reject a project section
// @route   POST /api/faculty/review-section
// @access  Private (Faculty Only)
const submitReview = async (req, res) => {
  try {
    const db = admin.firestore();
    const facultyUid = req.user.uid;
    const { projectId, sectionId, status, comment } = req.body;

    if (!projectId || !sectionId || !status) {
      return res.status(400).json({ message: 'Project ID, Section ID, and Status are required.' });
    }

    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // --- SECURITY CHECK ---
    if (projectDoc.data().mentorUid !== facultyUid) {
      return res.status(403).json({ message: 'Not authorized to review this project.' });
    }

    // Use dot notation to update the 'status' and 'comment' fields
    // inside the specific section map (e.g., sections.abstract.status)
    const updateData = {
      [`sections.${sectionId}.status`]: status, // 'approved' or 'rejected'
      [`sections.${sectionId}.comment`]: comment || '' // Add the comment
    };

    await projectRef.update(updateData);

    res.status(200).json({ message: `Section ${sectionId} has been ${status}.` });

  } catch (error) {
    console.error('Error in submitReview:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve ALL sections of a project at once
// @route   POST /api/faculty/approve-all
// @access  Private (Faculty Only)
const approveAllSections = async (req, res) => {
  try {
    const db = admin.firestore();
    const facultyUid = req.user.uid;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Security Check
    const projectData = projectDoc.data();
    if (projectData.mentorUid !== facultyUid) {
      return res.status(403).json({ message: 'Not authorized to review this project.' });
    }

    // Construct update object
    const currentSections = projectData.sections || {};
    const updates = {};

    // Iterate over all existing sections and set status to approved
    Object.keys(currentSections).forEach(sectionKey => {
      updates[`sections.${sectionKey}.status`] = 'approved';
    });

    if (Object.keys(updates).length === 0) {
      return res.status(200).json({ message: 'No sections to approve.' });
    }

    await projectRef.update(updates);

    res.status(200).json({ message: 'All sections approved successfully.' });

  } catch (error) {
    console.error('Error in approveAllSections:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports = {
  getMyStudents,
  getStudentProject,
  submitReview,
  approveAllSections // <--- ADD THIS LINE
};