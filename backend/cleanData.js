// File: backend/cleanData.js
const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase (Copying logic from your server.js)
const serviceAccountPath = path.resolve(__dirname, './firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();
const auth = admin.auth();

async function cleanData() {
  console.log("⚠️ STARTING DATA CLEANUP...");

  // 1. Get all users from Firestore to identify Roles
  const usersSnapshot = await db.collection('users').get();
  
  const deletePromises = [];
  
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    const uid = doc.id;

    if (userData.role === 'hod') {
      console.log(`✅ Keeping HOD: ${userData.name} (${userData.email})`);
    } else {
      console.log(`❌ Deleting User: ${userData.name} (${userData.role})`);
      
      // Delete from Firestore
      deletePromises.push(db.collection('users').doc(uid).delete());
      
      // Delete from Authentication (Login)
      deletePromises.push(auth.deleteUser(uid).catch(e => console.log(`Auth delete error for ${uid}:`, e.message)));
    }
  });

  // 2. Wipe Projects Collection
  const projectsSnapshot = await db.collection('projects').get();
  projectsSnapshot.forEach(doc => {
    deletePromises.push(db.collection('projects').doc(doc.id).delete());
  });
  console.log(`🗑 Marked ${projectsSnapshot.size} projects for deletion.`);

  // 3. Wipe Classes Collection
  const classesSnapshot = await db.collection('classes').get();
  classesSnapshot.forEach(doc => {
    deletePromises.push(db.collection('classes').doc(doc.id).delete());
  });
  console.log(`🗑 Marked ${classesSnapshot.size} classes for deletion.`);

  // Execute all deletions
  await Promise.all(deletePromises);
  console.log("\n✨ CLEANUP COMPLETE. Only HODs remain.");
  process.exit();
}

cleanData();