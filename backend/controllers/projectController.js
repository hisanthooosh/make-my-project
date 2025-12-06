// File: backend/controllers/projectController.js
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

// --- Helper: Clean Data for Firestore ---
// Removes undefined values to prevent Firestore crashes.
// NOTE: We only use this on raw data (strings/objects), NOT on Firestore timestamps!
const removeUndefined = (obj) => {
  return JSON.parse(JSON.stringify(obj));
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
    
    // Get data
    const { section, content, status } = req.body; 
    
    // Strict validation
    if (!section || content === undefined || !status) {
      return res.status(400).json({ message: 'Section, content, and status are required' });
    }

    // 1. Check if the project exists
    const projectQuery = await db.collection('projects').where('studentUid', '==', studentUid).limit(1).get();
    
    if (projectQuery.empty) {
      // --- CREATE NEW PROJECT ---
      // Fix: We sanitize the raw data FIRST, then add the timestamp manually.
      // This prevents JSON.stringify from destroying the serverTimestamp object.
      
      const safeData = removeUndefined({
        studentUid: studentUid,
        mentorUid: req.user.assignedMentorId || null,
        sections: {
          [section]: { // Create the first section immediately
            content: content,
            status: status
          }
        },
        images: []
      });

      // Now add the timestamp (safely)
      const finalData = {
        ...safeData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('projects').add(finalData);

    } else {
      // --- UPDATE EXISTING PROJECT ---
      const docId = projectQuery.docs[0].id;
      const projectRef = db.collection('projects').doc(docId);

      // Clean the content to ensure no undefined values are inside
      const safeContent = removeUndefined(content);

      // Use Dot Notation to update ONLY the specific fields.
      // This creates 'sections.intro' if it doesn't exist, or updates it if it does.
      const updates = {
        [`sections.${section}.content`]: safeContent,
        [`sections.${section}.status`]: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await projectRef.update(updates);
    }

    res.status(200).json({ message: `Section '${section}' updated successfully` });

  } catch (error) {
    console.error('Error in updateProjectSection:', error);
    res.status(500).json({ message: 'Server error while updating section' });
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
      // --- SAFE CREATE FOR IMAGES ---
      const safeData = removeUndefined({
        studentUid: studentUid,
        mentorUid: req.user.assignedMentorId || null,
        sections: {},
        images: imageUrls
      });

      const finalData = {
        ...safeData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('projects').add(finalData);
    } else {
      const docId = projectQuery.docs[0].id;
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