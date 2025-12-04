// File: backend/controllers/projectController.js
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

// (The streamUpload function stays the same)
const streamUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// --- NEW FUNCTION: updateProjectSection ---
// @desc    Student saves/updates a single section of their project
// @route   POST /api/projects/update-section
// @access  Private (Student Only)
const updateProjectSection = async (req, res) => {
  try {
    const db = admin.firestore();
    const studentUid = req.user.uid;
    
    // We get the specific section, its content, AND the new status
    const { section, content, status } = req.body; 
    
    if (!section || content === undefined || !status) {
      return res.status(400).json({ message: 'Section, content, and status are required' });
    }

    // Find the student's project document
    const projectQuery = await db.collection('projects').where('studentUid', '==', studentUid).limit(1).get();
    
    let projectRef;
    let existingSections = {};

    if (projectQuery.empty) {
      // If no project, create one and add this first section
      const newProjectData = {
        studentUid: studentUid,
        mentorUid: req.user.assignedMentorId || null,
        sections: {}, // Sections start empty
        images: [], // Images start empty
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      // Create the new project document
      const docRef = await db.collection('projects').add(newProjectData);
      projectRef = db.collection('projects').doc(docRef.id);

    } else {
      // Project exists, get its reference and existing sections
      const docId = projectQuery.docs[0].id;
      projectRef = db.collection('projects').doc(docId);
      existingSections = projectQuery.docs[0].data().sections || {};
    }

    // --- Safe Update Logic ---
    // 1. Get the existing data for the section (if any)
    const existingSectionData = existingSections[section] || {};

    // 2. Merge old data with new data (content and status)
    const newSectionData = {
      ...existingSectionData, // Keeps old comments
      content: content,
      status: status // 'draft' or 'pending'
    };

    // 3. Use "dot notation" to update *only* this section in the 'sections' map
    const updateKey = `sections.${section}`;
    await projectRef.update({
      [updateKey]: newSectionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: `Section '${section}' updated successfully` });

  } catch (error) {
    console.error('Error in updateProjectSection:', error);
    res.status(500).json({ message: 'Server error while updating section' });
  }
};


// --- getMyProject (This stays the same, it's already perfect) ---
const getMyProject = async (req, res) => {
  try {
    const db = admin.firestore();
    const studentUid = req.user.uid;
    const projectQuery = await db.collection('projects').where('studentUid', '==', studentUid).limit(1).get();

    if (projectQuery.empty) {
      return res.status(404).json({ message: 'No project found' });
    }

    // Send the whole project doc, including the new 'sections' object
    const project = projectQuery.docs[0].data();
    project.id = projectQuery.docs[0].id; // Also send the document ID
    res.status(200).json(project);

  } catch (error) {
    console.error('Error in getMyProject:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- NEW FUNCTION: Upload project images (separate from sections) ---
const uploadProjectImages = async (req, res) => {
  try {
    const db = admin.firestore();
    const studentUid = req.user.uid;
    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await streamUpload(file.buffer);
        imageUrls.push(uploadResult.secure_url);
      }
    } else {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Find the project and add these images
    const projectQuery = await db.collection('projects').where('studentUid', '==', studentUid).limit(1).get();
    
    if (projectQuery.empty) {
      // This shouldn't happen if they save a section first, but as a fallback:
      const newProjectData = {
        studentUid: studentUid,
        mentorUid: req.user.assignedMentorId || null,
        sections: {},
        images: imageUrls, // Save images here
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('projects').add(newProjectData);
    } else {
      const docId = projectQuery.docs[0].id;
      await db.collection('projects').doc(docId).update({
        images: admin.firestore.FieldValue.arrayUnion(...imageUrls) // Add to existing images
      });
    }
    
    res.status(200).json({ message: 'Images uploaded successfully', images: imageUrls });

  } catch (error) { // <-- THIS LINE IS NOW CORRECT
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  updateProjectSection, // <-- Renamed/new
  getMyProject,
  uploadProjectImages // <-- New
};