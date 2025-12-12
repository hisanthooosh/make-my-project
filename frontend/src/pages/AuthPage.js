// File: frontend/src/pages/AuthPage.js

import React, { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import axios from 'axios';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [rollNumber, setRollNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');

  // Mentor & Class state
  const [mentors, setMentors] = useState([]);
  const [assignedMentorId, setAssignedMentorId] = useState('');
  const [classes, setClasses] = useState([]);
  const [assignedClassId, setAssignedClassId] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Logic remains exactly the same ---
  useEffect(() => {
    if (!isLogin && role === 'student') {
      const fetchData = async () => {
        try {
          const { data: mentorData } = await axios.get('http://localhost:5000/api/users/mentors');
          setMentors(mentorData);
          if (mentorData.length > 0) setAssignedMentorId(mentorData[0].uid);
          
          const { data: classData } = await axios.get('http://localhost:5000/api/users/classes');
          setClasses(classData);
          if (classData.length > 0) setAssignedClassId(classData[0].id);
          
        } catch (err) {
          setError('Could not load required lists.');
        }
      };
      fetchData();
    }
  }, [isLogin, role]);

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
        role: role,
        rollNumber: rollNumber,
        assignedMentorId: assignedMentorId,
        assignedClassId: assignedClassId,
        designation: designation,
        department: department
      };

      await axios.post('http://localhost:5000/api/users/register', userData);
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
            Simplifying Academic Reports.<br/>
            Professional Formatting. One-Click PDF.
          </p>
        </div>
      </div>

      {/* --- RIGHT SIDE: THE SCROLLABLE FORM --- */}
      <div className="auth-right-form">
        <div className="form-wrapper">
          
          <div className="auth-header">
            <h2>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
            <p>{isLogin ? 'Enter your details to access your dashboard.' : 'Get started with your project journey.'}</p>
          </div>

          {error && <div className="form-error">⚠ {error}</div>}

          <form onSubmit={isLogin ? handleLogin : handleSignup}>
            
            {/* --- SIGNUP FIELDS --- */}
            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                
                <div className="form-group">
                  <label>I am a...</label>
                  <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty / Mentor</option>
                    <option value="hod">HOD</option>
                  </select>
                </div>

                {(role === 'faculty' || role === 'hod') && (
                  <>
                    <div className="form-group">
                      <label>Designation</label>
                      <input type="text" className="form-input" value={designation} onChange={e => setDesignation(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <input type="text" className="form-input" value={department} onChange={e => setDepartment(e.target.value)} required />
                    </div>
                  </>
                )}
                
                {role === 'student' && (
                  <>
                    <div className="form-group">
                      <label>Class / Section</label>
                      <select className="form-select" value={assignedClassId} onChange={e => setAssignedClassId(e.target.value)} required>
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
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="toggle-section">
            <p>
              {isLogin ? "New here?" : "Already have an account?"}
              <span className="toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                {isLogin ? 'Create Account' : 'Sign In'}
              </span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AuthPage;