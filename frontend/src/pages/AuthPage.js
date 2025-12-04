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
  const [designation, setDesignation] = useState(''); // <-- NEW
  const [department, setDepartment] = useState('');   // <-- NEW

  // Mentor state
  const [mentors, setMentors] = useState([]);
  const [assignedMentorId, setAssignedMentorId] = useState('');

  // --- NEW CLASS STATE ---
  const [classes, setClasses] = useState([]);
  const [assignedClassId, setAssignedClassId] = useState('');
  // -----------------------

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- useEffect hook: Fetch Mentors and Classes on Signup ---
  useEffect(() => {
    // This runs only on the Student Signup form
    if (!isLogin && role === 'student') {
      const fetchData = async () => {
        try {
          // Fetch Mentors
          const { data: mentorData } = await axios.get('http://localhost:5000/api/users/mentors');
          setMentors(mentorData);
          if (mentorData.length > 0) {
            setAssignedMentorId(mentorData[0].uid);
          }
          
          // Fetch Classes (NEW)
          const { data: classData } = await axios.get('http://localhost:5000/api/users/classes');
          setClasses(classData);
          if (classData.length > 0) {
            setAssignedClassId(classData[0].id); // Set default to the first class ID
          }
          
        } catch (err) {
          setError('Could not load required lists (mentors/classes).');
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
      // Client-side auth creation
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Data sent to Express backend
      const userData = {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        rollNumber: rollNumber,
        assignedMentorId: assignedMentorId,
        assignedClassId: assignedClassId, // <-- SEND THE SELECTED CLASS
        
       
        designation: designation, // <-- NEW
        department: department    // <-- NEW
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
    <div className="auth-container">
      <div className="form-card">
        <h2>{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
        
        {error && <p className="form-error">{error}</p>}

        <form onSubmit={isLogin ? handleLogin : handleSignup}>
          
          {/* --- Fields for SIGNUP only --- */}
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
             <div className="form-group">
                <label>I am a...</label>
                <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty / Mentor</option>
                  <option value="hod">HOD (Head of Department)</option>
                </select>
              </div>

              {/* --- Show Department/Designation for Faculty/HOD --- */}
              {(role === 'faculty' || role === 'hod') && (
                <>
                  <div className="form-group">
                    <label>Designation</label>
                    <input
                      type="text"
                      className="form-input"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g., Assistant Professor"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      className="form-input"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g., Computer Applications"
                      required
                    />
                  </div>
                </>
              )}
              

              {/* --- Show these fields ONLY for students --- */}
              {role === 'student' && (
                <>
                  {/* NEW CLASS DROPDOWN */}
                  <div className="form-group">
                    <label>Select Your Class</label>
                    <select 
                      className="form-select"
                      value={assignedClassId} 
                      onChange={(e) => setAssignedClassId(e.target.value)}
                      required
                    >
                      {classes.length === 0 ? (
                        <option value="" disabled>Loading classes...</option>
                      ) : (
                        classes.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))
                      )}
                    </select>
                    {classes.length === 0 && <p style={{fontSize: '12px', color: 'red'}}>*HOD must create a class before students can sign up.</p>}
                  </div>
                  {/* END NEW CLASS DROPDOWN */}


                  <div className="form-group">
                    <label>Roll Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Select Your Mentor</label>
                    <select 
                      className="form-select"
                      value={assignedMentorId} 
                      onChange={(e) => setAssignedMentorId(e.target.value)}
                      required
                    >
                      {mentors.length === 0 ? (
                        <option value="" disabled>Loading mentors...</option>
                      ) : (
                        mentors.map(mentor => (
                          <option key={mentor.uid} value={mentor.uid}>
                            {mentor.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          {/* --- Fields for BOTH Login & Signup --- */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="form-button" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <p className="toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span className="toggle-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? ' Login' : ' Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;