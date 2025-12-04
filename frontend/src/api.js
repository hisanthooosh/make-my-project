// File: frontend/src/api.js

import axios from 'axios';
import { auth } from './firebaseConfig'; // We need this to get the token

// Create an 'instance' of axios that points to our backend
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// --- THIS IS THE NEW, IMPORTANT PART ---
// This "interceptor" runs BEFORE every single API request
api.interceptors.request.use(
  async (config) => {
    // Get the currently logged-in user
    const user = auth.currentUser;

    if (user) {
      // If the user is logged in, get their ID token
      const token = await user.getIdToken();
      // Add the token to the 'Authorization' header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config; // Send the request
  },
  (error) => {
    return Promise.reject(error);
  }
);
// ------------------------------------

export default api;