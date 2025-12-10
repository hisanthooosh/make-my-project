// File: backend/controllers/projectController.js
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

// --- Helper: Clean Data for Firestore ---
const cleanData = (data) => {
  return JSON.parse(JSON.stringify(data));
};

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

// --- updateProjectSection ---
const updateProjectSection = async (req, res) => {
  try {
    const db = admin.firestore();
    const studentUid = req.user.uid;
    // --- ADD THIS SECURITY CHECK ---
    if (!req.user.isPaid) {
      return res.status(403).json({
        success: false,
        message: 'Payment required to save or edit reports.'
      });
    }

    console.log("updateProjectSection called by:", studentUid);

    // Get data
    let { section, content, status } = req.body;

    if (!section) {
      return res.status(400).json({ success: false, message: 'Section name is required' });
    }

    // --- CRITICAL FIX: FLATTEN ARRAYS ---
    // The log showed content: [ ["url"], "url" ]. Firestore CRASHES on nested arrays.
    // This line forces it to become [ "url", "url" ]
    if (Array.isArray(content)) {
      console.log("Flattening nested array content...");
      content = content.flat(Infinity);
    }

    // Sanitize everything
    const safeSection = String(section).trim();
    const safeContent = content === undefined ? "" : cleanData(content);
    const safeStatus = status === undefined ? "pending" : cleanData(status);

    // Find the project
    const projectQuery = await db.collection('projects').where('studentUid', '==', studentUid).limit(1).get();

    if (projectQuery.empty) {
      // --- CREATE NEW PROJECT ---
      const newProjectData = {
        studentUid: studentUid,
        mentorUid: req.user.assignedMentorId || null,
        sections: {
          [safeSection]: {
            content: safeContent,
            status: safeStatus
          }
        },
        images: []
      };

      const finalData = cleanData(newProjectData);
      finalData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await db.collection('projects').add(finalData);

    } else {
      // --- UPDATE EXISTING PROJECT ---
      const docId = projectQuery.docs[0].id;
      const projectRef = db.collection('projects').doc(docId);

      // Use 'set' with merge: true for safety
      const dataToMerge = {
        sections: {
          [safeSection]: {
            content: safeContent,
            status: safeStatus
          }
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await projectRef.set(dataToMerge, { merge: true });
    }

    console.log("Success: Section updated.");
    res.status(200).json({ success: true, message: `Section '${safeSection}' updated successfully` });

  } catch (error) {
    console.error('CRITICAL ERROR in updateProjectSection:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// --- getMyProject ---
const getMyProject = async (req, res) => {
  try {
    const db = admin.firestore();
    const studentUid = req.user.uid;
    const projectQuery = await db.collection('projects').where('studentUid', '==', studentUid).limit(1).get();

    if (projectQuery.empty) {
      return res.status(404).json({ message: 'No project found' });
    }

    const project = projectQuery.docs[0].data();
    project.id = projectQuery.docs[0].id;
    res.status(200).json(project);

  } catch (error) {
    console.error('Error in getMyProject:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- uploadProjectImages ---
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

    const projectQuery = await db.collection('projects').where('studentUid', '==', studentUid).limit(1).get();

    if (projectQuery.empty) {
      // Safe create for images
      const projectData = {
        studentUid: studentUid,
        mentorUid: req.user.assignedMentorId || null,
        sections: {},
        images: imageUrls
      };

      const finalData = cleanData(projectData);
      finalData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await db.collection('projects').add(finalData);
    } else {
      const docId = projectQuery.docs[0].id;
      // We use arrayUnion here to add new images to the list
      await db.collection('projects').doc(docId).update({
        images: admin.firestore.FieldValue.arrayUnion(...imageUrls),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(200).json({ message: 'Images uploaded successfully', images: imageUrls });

  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  updateProjectSection,
  getMyProject,
  uploadProjectImages
};