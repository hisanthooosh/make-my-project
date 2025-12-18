// File: frontend/src/pages/AuthPage.js

import React, { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
// import axios from 'axios'; <--- DELETE THIS
import api from '../api'; // <--- USE YOUR API HELPER
import './AuthPage.css';
// Add this line at the top with other imports:
import { Link } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // ROLE IS NOW LOCKED TO 'student' FOR SIGNUPS
  const [role] = useState('student');

  const [rollNumber, setRollNumber] = useState('');

  // Mentor & Class state
  const [mentors, setMentors] = useState([]);
  const [assignedMentorId, setAssignedMentorId] = useState('');
  const [classes, setClasses] = useState([]);
  const [assignedClassId, setAssignedClassId] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch Mentors & Classes only if we are on the Signup page
  useEffect(() => {
    if (!isLogin) {
      const fetchData = async () => {
        try {
          // --- FIX: Use api.get instead of axios.get with localhost ---
          // This automatically calls /api/users/mentors on the Azure server
          const { data: mentorData } = await api.get('/users/mentors');
          setMentors(mentorData);
          if (mentorData.length > 0) setAssignedMentorId(mentorData[0].uid);

          const { data: classData } = await api.get('/users/classes');
          setClasses(classData);
          if (classData.length > 0) setAssignedClassId(classData[0].id);

        } catch (err) {
          console.error(err);
          setError('Could not load required lists. Check your internet connection.');
        }
      };
      fetchData();
    }
  }, [isLogin]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        uid: user.uid,
        name: name,
        email: email,
        role: 'student', // FORCE ROLE TO STUDENT
        rollNumber: rollNumber,
        assignedMentorId: assignedMentorId,
        assignedClassId: assignedClassId,
      };

      // --- FIX: Use api.post instead of axios.post ---
      await api.post('/users/register', userData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-screen">

      {/* --- LEFT SIDE: THE BIG ADVERTISEMENT --- */}
      <div className="auth-left-ad">
        <div className="brand-content">
          <h1 className="brand-title">MAKE MY<br />PROJECT</h1>
          <p className="brand-tagline">
            Simplifying Academic Reports.<br />
            Professional Formatting. One-Click PDF.
          </p>
        </div>
      </div>

      {/* --- RIGHT SIDE: THE SCROLLABLE FORM --- */}
      <div className="auth-right-form">
        <div className="form-wrapper">

          <div className="auth-header">
            <h2>{isLogin ? 'Welcome Back!' : 'Student Registration'}</h2>
            <p>{isLogin ? 'Faculty & Students: Login below.' : 'Enter your details to start your project.'}</p>
          </div>

          {error && <div className="form-error">⚠ {error}</div>}

          <form onSubmit={isLogin ? handleLogin : handleSignup}>

            {/* --- SIGNUP FIELDS (STUDENT ONLY) --- */}
            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Class / Section</label>
                  <select
                    className="form-select"
                    value={assignedClassId}
                    onChange={e => setAssignedClassId(e.target.value)}
                    required
                    style={{ color: 'black', backgroundColor: 'white' }}  // <--- ADD THIS
                  >
                    {classes.length === 0 ? <option disabled>Loading...</option> : classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Roll Number</label>
                  <input type="text" className="form-input" value={rollNumber} onChange={e => setRollNumber(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Assigned Mentor</label>
                  <select className="form-select" value={assignedMentorId} onChange={e => setAssignedMentorId(e.target.value)} required>
                    {mentors.length === 0 ? <option disabled>Loading...</option> : mentors.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* --- COMMON FIELDS --- */}
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-input" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <button type="submit" className="form-button" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register as Student')}
            </button>
          </form>

          <div className="toggle-section">
            <p>
              {isLogin ? "New Student?" : "Already have an account?"}
              <span className="toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                {isLogin ? 'Create Account' : 'Sign In'}
              </span>
            </p>
          </div>
          {/* --- PASTE THIS CODE HERE --- */}
          <footer style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
              <Link to="/terms" style={{ color: '#666', textDecoration: 'none' }}>Terms & Conditions</Link>
              <Link to="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy Policy</Link>
              <Link to="/refund" style={{ color: '#666', textDecoration: 'none' }}>Refund Policy</Link>
              <Link to="/contact" style={{ color: '#666', textDecoration: 'none' }}>Contact Us</Link>
            </div>
            <div>&copy; 2025 Make My Project. All rights reserved.</div>
          </footer>
          {/* --------------------------- */}

        </div>
      </div>
    </div>
  );
};

export default AuthPage;