// File: frontend/src/api.js

import axios from 'axios';
import { auth } from './firebaseConfig'; 

// --- SMART BASE URL CONFIGURATION ---
const isLocal = window.location.hostname === 'localhost';

// CHANGE 8080 TO 5000 HERE:
const api = axios.create({
  baseURL: isLocal ? 'http://localhost:5000/api' : '/api' 
});

// --- SECURITY INTERCEPTOR ---
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;