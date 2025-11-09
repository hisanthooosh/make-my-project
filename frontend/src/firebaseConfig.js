// File: frontend/src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBKdngGFD_Fbl1gi0mqEGag35wunIp_icA",
  authDomain: "make-my-report22.firebaseapp.com",
  projectId: "make-my-report22",
  storageBucket: "make-my-report22.firebasestorage.app",
  messagingSenderId: "564504566963",
  appId: "1:564504566963:web:2a8e67ad07257b343b24c6"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the Firebase Authentication service
// THIS IS THE LINE THAT FIXES THE ERROR:
export const auth = getAuth(app);