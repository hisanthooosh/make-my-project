// File: backend/controllers/hodController.js
const admin = require('firebase-admin');

// --- Helper Function to get section counts ---
const calculateProjectStats = (project) => {
  if (!project || !project.sections) {
    return { approved: 0, pending: 0, rejected: 0, total: 0, progress: 0 };
  }

  // This must match the `reportStructure` on the frontend
  const allSectionIds = [
    'certificate', 'declaration', 'abstract', 'toc',
    'intro_main', 'intro_aim', 'intro_domain', 'intro_scope',
    'literatureReview',
    'problem_existing', 'problem_hardware', 'problem_software',
    'proposed_objectives', 'proposed_formulation', 'proposed_methodology',
    'datasetCollection',
    'design_high_level', 'design_flow_chart', 'design_use_case', 'design_class',
    'design_sequence', 'design_deployment', 'design_activity',
    'impl_platform', 'impl_testing', 'impl_results',
    'concl_limitations', 'concl_future_work',
    'references', 'bioData'
  ];
  
  let approved = 0;
  let pending = 0;
  let rejected = 0;
  const total = allSectionIds.length;

  allSectionIds.forEach(id => {
    const status = project.sections[id]?.status;
    if (status === 'approved') {
      approved++;
    } else if (status === 'rejected') {
      rejected++;
    } else if (status === 'pending') {
      pending++;
    }
  });
  
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0;

  return { approved, pending, rejected, total, progress };
};


// @desc    Get all stats for the HOD Dashboard
// @route   GET /api/hod/dashboard-stats
// @access  Private (HOD Only)
const getDashboardStats = async (req, res) => {
  try {
    const db = admin.firestore();

    // 1. Get all users
    const usersSnapshot = await db.collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Get all classes
    const classesSnapshot = await db.collection('classes').get();
    const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    // Create a Map for fast project lookup by student UID
    const projectsMap = new Map();
    projectsSnapshot.forEach(doc => {
      projectsMap.set(doc.data().studentUid, { id: doc.id, ...doc.data() });
    });

    // 4. Process Faculty: Get faculty and count their students
    const facultyList = allUsers.filter(user => user.role === 'faculty');
    const studentList = allUsers.filter(user => user.role === 'student');

    const facultyWithCounts = facultyList.map(faculty => {
      const studentCount = studentList.filter(s => s.assignedMentorId === faculty.uid).length;
      return {
        uid: faculty.uid,
        name: faculty.name,
        email: faculty.email,
        studentCount: studentCount
      };
    });

    // 5. Process Classes: Get classes and count their students
    const classesWithCounts = allClasses.map(cls => {
      const studentCount = studentList.filter(s => s.assignedClassId === cls.id).length;
      return {
        id: cls.id,
        name: cls.className,
        department: cls.department,
        studentCount: studentCount
      };
    });

    // 6. Process All Students: Get full details for the table
    const allStudentsWithDetails = studentList.map(student => {
      const faculty = facultyList.find(f => f.uid === student.assignedMentorId);
      const cls = allClasses.find(c => c.id === student.assignedClassId);
      const project = projectsMap.get(student.uid);
      const stats = calculateProjectStats(project);

      return {
        uid: student.uid,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        className: cls ? cls.className : 'N/A',
        facultyName: faculty ? faculty.name : 'N/A',
        status: project ? (stats.progress === 100 ? 'Completed' : `${stats.progress}%`) : 'Not Started',
        approved: stats.approved,
        rejected: stats.rejected,
        total: stats.total
      };
    });

    // 7. Send all data at once
    res.status(200).json({
      facultyWithCounts,
      classesWithCounts,
      allStudentsWithDetails
    });

  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Get a single student's project (for HOD review)
// @route   GET /api/hod/student-project/:studentId
// @access  Private (HOD Only)
const getStudentProjectForHod = async (req, res) => {
  try {
    const db = admin.firestore();
    const { studentId } = req.params;

    const projectQuery = await db.collection('projects')
      .where('studentUid', '==', studentId)
      .limit(1)
      .get();

    if (projectQuery.empty) {
      return res.status(404).json({ message: 'No project found for this student.' });
    }

    const project = projectQuery.docs[0].data();
    project.id = projectQuery.docs[0].id;
    
    res.status(200).json(project);

  } catch (error) {
    console.error('Error in getStudentProjectForHod:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new class
// @route   POST /api/hod/create-class
// @access  Private (HOD Only)
const createClass = async (req, res) => {
  try {
    const db = admin.firestore();
    const { className, department } = req.body;

    if (!className || !department) {
      return res.status(400).json({ message: 'Class Name and Department are required' });
    }

    const newClass = {
      className,
      department,
      hodUid: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('classes').add(newClass);
    res.status(201).json({ 
      message: 'Class created successfully', 
      id: docRef.id, 
      name: className, 
      department: department,
      studentCount: 0 
    });
  } catch (error) {
    console.error('Error in createClass:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a student (Auth + Firestore + Project)
// @route   DELETE /api/hod/delete-student/:studentId
// @access  Private (HOD Only)
const deleteStudent = async (req, res) => {
  try {
    const db = admin.firestore();
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    console.log(`HOD deleting student: ${studentId}`);

    // 1. Delete from Firebase Authentication
    await admin.auth().deleteUser(studentId);

    // 2. Delete from Firestore 'users' collection
    await db.collection('users').doc(studentId).delete();

    // 3. Delete their Project (if it exists)
    const projectQuery = await db.collection('projects').where('studentUid', '==', studentId).get();
    if (!projectQuery.empty) {
      const batch = db.batch();
      projectQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    res.status(200).json({ message: 'Student deleted successfully' });

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Server error while deleting student' });
  }
};

module.exports = {
  getDashboardStats,
  getStudentProjectForHod,
  createClass,
  // Other functions like assignMentor, deleteUser can be added back if needed
  deleteStudent // <--- ADD THIS LINE
};