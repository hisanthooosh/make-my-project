// File: frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
// import axios from 'axios';  <-- DELETE THIS LINE
import api from './api';    // <-- ADD THIS LINE (Use the helper we created)

// --- NEW IMPORTS FOR ROUTING & POLICIES ---
import { Routes, Route, Navigate } from 'react-router-dom';
import PolicyPage from './pages/PolicyPage';
import { TermsContent, PrivacyContent, RefundContent, ContactContent } from './pages/LegalContents';
// ------------------------------------------

// Import all our pages
import AuthPage from './pages/AuthPage';
import HodDashboard from './pages/HodDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is our master listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // --- User is signed in ---
        try {
          // 1. Get the user's secret ID token
          const token = await user.getIdToken();

          // 2. Send this token to our secure backend route
          const config = {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          };
          
          // --- THE FIX IS HERE ---
          // OLD: axios.get('http://localhost:5000/api/users/profile', config)
          // NEW: We use 'api.get' and REMOVE the localhost part.
          // It will automatically use https://your-site.azurewebsites.net/api
          
          const response = await api.get('/users/profile', config);
          
          // -----------------------

          // 4. Save the full user profile (name, role, etc.) in our state
          setCurrentUser(response.data);

        } catch (error) {
          console.error("Could not fetch user profile:", error);

          // SAFEGUARD: Only log out if it's a real authentication error
          // 401 = Token Invalid, 404 = User Deleted
          if (error.response && (error.response.status === 401 || error.response.status === 404)) {
             await signOut(auth);
             setCurrentUser(null);
          } else {
             // If it's a Network Error or Server Timeout (500), 
             // Do NOT log them out. Just let them stay on the screen.
             console.log("Network glitch - keeping user session active.");
          }
        }
      } else {
        // --- User is signed out ---
        setCurrentUser(null);
      }
      setLoading(false); // Done checking
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // The empty array [] means this effect runs once on mount

  // Handle the logout button click
  const handleLogout = async () => {
    try {
      await signOut(auth); // This signs the user out
      setCurrentUser(null); // Clear the user state
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // --- Show a loading screen while we check ---
  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <h2>Loading...</h2>
      </div>
    );
  }

  // --- LOGGED IN VIEW: Show the correct Dashboard based on Role ---
  if (currentUser) {
    switch (currentUser.role) {
      case 'hod':
        return <HodDashboard user={currentUser} onLogout={handleLogout} />;
      case 'faculty':
        return <FacultyDashboard user={currentUser} onLogout={handleLogout} />;
      case 'student':
        return <StudentDashboard user={currentUser} onLogout={handleLogout} />;
        
      default:
        // This is a safety net
        return (
          <div>
            <h2>Error bro</h2>
            <p>Unknown user role: {currentUser.role}</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        );
    }
  }

  // --- LOGGED OUT VIEW: Show Auth Page OR Policy Pages ---
  return (
    <div className="App">
      <Routes>
        {/* Main Login/Signup Page */}
        <Route path="/" element={<AuthPage />} />
        
        {/* --- NEW POLICY ROUTES (Required for Razorpay) --- */}
        <Route path="/terms" element={<PolicyPage title="Terms and Conditions" ContentComponent={TermsContent} />} />
        <Route path="/privacy" element={<PolicyPage title="Privacy Policy" ContentComponent={PrivacyContent} />} />
        <Route path="/refund" element={<PolicyPage title="Refund Policy" ContentComponent={RefundContent} />} />
        <Route path="/contact" element={<PolicyPage title="Contact Us" ContentComponent={ContactContent} />} />
        {/* ----------------------------------------------- */}

        {/* Catch-all: Redirect unknown links back to Home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;