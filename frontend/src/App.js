// File: frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
// import axios from 'axios';  <-- DELETE THIS LINE
import api from './api';    // <-- ADD THIS LINE (Use the helper we created)

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
          // If Firestore profile fails, log them out
          await signOut(auth);
          setCurrentUser(null);
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

  // --- This is our main "Router" ---
  const renderDashboard = () => {
    if (!currentUser) {
      // If no user, show the Login/Signup page
      return <AuthPage />;
    }
    
    // If a user is logged in, check their role
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
            <h2>Error</h2>
            <p>Unknown user role: {currentUser.role}</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        );
    }
  };

  return (
    <div className="App">
      {renderDashboard()}
    </div>
  );
}

export default App;