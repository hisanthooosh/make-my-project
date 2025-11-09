import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import './HodDashboard.css'; // This is the new CSS file
import mbuLogo from '../assets/MBU_Logo.png';

// This structure must be identical to the one in StudentDashboard.js
// to ensure the preview renders correctly.
const reportStructure = [
  { id: 'certificate', title: 'Certificate', isPage: true, subsections: [] },
  { id: 'declaration', title: 'Declaration', isPage: true, subsections: [] },
  { id: 'abstract', title: 'Abstract', isPage: true, subsections: [] },
  { id: 'toc', title: 'Table of Contents', isPage: true, subsections: [] },
  {
    id: 'introduction',
    title: '1. Introduction',
    isPage: false, 
    subsections: [
      { id: 'intro_main', title: '1.1 Introduction', isPage: true }, 
      { id: 'intro_aim', title: '1.2 Aim of the Project', isPage: true }, 
      { id: 'intro_domain', title: '1.3 Project Domain', isPage: true }, 
      { id: 'intro_scope', title: '1.4 Scope of the Project', isPage: true } 
    ]
  },
  {
    id: 'literatureReview',
    title: '2. Literature Review',
    isPage: true, 
    subsections: []
  },
  {
    id: 'problemDefinition',
    title: '3. Problem Definition',
    isPage: false, 
    subsections: [
      { id: 'problem_existing', title: '3.1 Existing System', isPage: true }, 
      { id: 'problem_hardware', title: '3.2 Hardware Requirements', isPage: true }, 
      { id: 'problem_software', title: '3.3 Software Requirements', isPage: true } 
    ]
  },
  {
    id: 'proposedSystem',
    title: '4. Proposed System',
    isPage: false, 
    subsections: [
      { id: 'proposed_objectives', title: '4.1 Objectives', isPage: true }, 
      { id: 'proposed_formulation', title: '4.2 Problem Formulation', isPage: true }, 
      { id: 'proposed_methodology', title: '4.3 Methodology', isPage: true } 
    ]
  },
  { id: 'datasetCollection', title: '5. Dataset Collection', isPage: true, subsections: [] },
  {
    id: 'systemDesign',
    title: '6. System Design (UML)',
    isPage: false, 
    subsections: [
      { id: 'design_high_level', title: '6.1 High level Design', isPage: true, inputType: 'image' }, 
      { id: "design_flow_chart", title: "6.2 System Flow Chart", isPage: true, inputType: 'image' }, 
      { id: "design_use_case", title: "6.3 Use case Diagram", isPage: true, inputType: 'image' }, 
      { id: "design_class", title: "6.4 Class Diagram", isPage: true, inputType: 'image' }, 
      { id: "design_sequence", title: "6.5 Sequence Diagram", isPage: true, inputType: 'image' }, 
      { id: "design_deployment", title: "6.6 Deployment Diagram", isPage: true, inputType: 'image' }, 
      { id: "design_activity", title: "6.7 Activity Diagram", isPage: true, inputType: 'image' }, 
    ]
  },
  {
    id: 'implementation',
    title: '7. Implementation',
    isPage: false, 
    subsections: [
      { id: 'impl_platform', title: '7.1 Platform/Technologies', isPage: true }, 
      { id: 'impl_testing', title: '7.2 System Testing', isPage: true }, 
      { id: 'impl_results', title: '7.3 Results', isPage: true } 
    ]
  },
  {
    id: 'conclusion',
    title: '8. Conclusion',
    isPage: false, 
    subsections: [
      { id: 'concl_limitations', title: '8.1 Limitations', isPage: true }, 
      { id: 'concl_future_work', title: '8.2 Future Work', isPage: true } 
    ]
  },
  { id: 'references', title: '9. References', isPage: true, subsections: [] },
  { id: 'bioData', title: 'Student Bio-data (Resume)', isPage: true, subsections: [] }
];
const allSections = reportStructure.flatMap(s => s.subsections.length > 0 ? s.subsections : s);
const getDefaultContent = (sectionId) => "[Content not submitted yet]";

// --- HOD Dashboard Component ---
function HodDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Data states
  const [facultyList, setFacultyList] = useState([]);
  const [classList, setClassList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  
  // Search state
  const [studentSearch, setStudentSearch] = useState('');

  // Form states
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('');
  const [className, setClassName] = useState('');
  const [classDepartment, setClassDepartment] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);

  // Preview Modal states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const pdfPreviewRef = useRef(null);

  // Fetch all dashboard data on load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/hod/dashboard-stats');
      setFacultyList(data.facultyWithCounts || []);
      setClassList(data.classesWithCounts || []);
      setStudentList(data.allStudentsWithDetails || []);
      setError('');
    } catch (err) {
      setError('Could not load dashboard data.');
      console.error(err);
    }
    setLoading(false);
  };

  // --- Form Handlers ---
  // --- NEW: Handle Create Faculty ---
  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(''); // Clear old errors
    try {
      const { data } = await api.post('/hod/create-faculty', {
        name: facultyName,
        email: facultyEmail,
        password: facultyPassword
      });
      // Add new faculty to the top of the list
      setFacultyList(prev => [{ ...data, studentCount: 0 }, ...prev]);
      
      // Reset form and close modal
      setIsFacultyModalOpen(false);
      setFacultyName('');
      setFacultyEmail(''); // <-- THIS IS THE CORRECTED LINE
      setFacultyPassword('');
      alert('Faculty created successfully!');

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create faculty.');
      console.error(err); // Keep console.error for debugging
    }
    setFormLoading(false);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(''); // Clear old errors
    try {
      const { data } = await api.post('/hod/create-class', {
        className: className,
        department: classDepartment
      });
      setClassList(prev => [data, ...prev]); // Add new class to list
      setClassName('');
      setClassDepartment('');
      alert('Class created successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create class.');
    }
    setFormLoading(false);
  };

  // --- Student Search ---
  const filteredStudents = useMemo(() => {
    if (!studentSearch) {
      return studentList;
    }
    return studentList.filter(student =>
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (student.rollNumber && student.rollNumber.toLowerCase().includes(studentSearch.toLowerCase()))
    );
  }, [studentList, studentSearch]);

  // --- Preview Modal ---
  const openProjectPreview = async (student) => {
    setSelectedStudent(student);
    setIsPreviewOpen(true);
    setLoadingProject(true);
    setSelectedProject(null);
    setError(''); // Clear main error
    try {
      const { data } = await api.get(`/hod/student-project/${student.uid}`);
      setSelectedProject(data);
      setCurrentPageIndex(0);
    } catch (err) {
      console.error(err);
      setSelectedProject(null); // Keep project null on error
    }
    setLoadingProject(false);
  };

  const closeProjectPreview = () => {
    setIsPreviewOpen(false);
    setSelectedStudent(null);
    setSelectedProject(null);
    setError('');
  };

  const allPages = useMemo(() => {
    const pages = [];
    if (!selectedProject) return []; 
    const project = selectedProject; // Use the loaded project data

    reportStructure.forEach(section => {
      if (section.isPage && section.subsections.length === 0) {
        const content = project.sections?.[section.id]?.content;
        const contentPages = Array.isArray(content) ? content : (content ? [content] : [getDefaultContent(section.id)]);
        if (contentPages.length === 0) contentPages.push(getDefaultContent(section.id));
        contentPages.forEach((_, index) => {
          pages.push({
            id: `${section.id}_${index}`,
            title: section.title,
            pageIndex: index,
            sectionId: section.id,
            parentTitle: null
          });
        });
      } 
      else if (!section.isPage && section.subsections.length > 0) {
        section.subsections.forEach(subSection => {
          if (!subSection.isPage) return;
          const content = project.sections?.[subSection.id]?.content;
          const contentPages = Array.isArray(content) ? content : (content ? [content] : [getDefaultContent(subSection.id)]);
          if (contentPages.length === 0) contentPages.push(getDefaultContent(subSection.id));
          contentPages.forEach((_, index) => {
            pages.push({
              id: `${subSection.id}_${index}`,
              title: subSection.title,
              pageIndex: index,
              sectionId: subSection.id,
              parentTitle: section.title
            });
          });
        });
      }
    });
    return pages;
  }, [selectedProject]);

  const totalPages = allPages.length;

  const handlePreviewNav = (direction) => {
    let newIndex = currentPageIndex;
    if (direction === 'next' && currentPageIndex < totalPages - 1) newIndex++;
    if (direction === 'prev' && currentPageIndex > 0) newIndex--;
    setCurrentPageIndex(newIndex);
  };
  
  // Helper to get status of a section
  const getSectionStatus = (sectionId) => {
    return selectedProject?.sections?.[sectionId]?.status || 'pending'; // Default to pending
  };

  // --- RENDER PREVIEW (Read-only) ---
  const renderPreview = () => {
    if (loadingProject) return <div className="preview-placeholder">Loading Project...</div>;
    if (!selectedProject) return <div className="preview-placeholder">This student has not started their project.</div>;
    if (allPages.length === 0) return <div className="preview-placeholder">Project data is empty.</div>;

    const certData = selectedProject.sections?.certificate?.content || {};
    const bioData = selectedProject.sections?.bioData?.content || {};
    
    const studentRollNo = selectedStudent.rollNumber || selectedStudent.email.split('@')[0];

    const getPageNumForSection = (sectionId) => {
      let pageIndex = allPages.findIndex(p => p.sectionId === sectionId);
      if (pageIndex !== -1) return pageIndex + 1;
      const parentSection = reportStructure.find(s => s.id === sectionId);
      if (parentSection && parentSection.subsections.length > 0) {
        const firstChildId = parentSection.subsections[0].id;
        pageIndex = allPages.findIndex(p => p.sectionId === firstChildId);
        if (pageIndex !== -1) return pageIndex + 1;
      }
      return '?';
    };

    return (
      <div className="preview-content-wrapper" ref={pdfPreviewRef}>
        <div className="preview-content-filmstrip" style={{
          transform: `translateX(-${currentPageIndex * 100}%)`
        }}>
          {allPages.map((page, index) => { 
            const { id: pageId, title, pageIndex: subPageIndex, sectionId, parentTitle } = page;
            const currentPageNum = index + 1;
            const sectionDef = allSections.find(s => s.id === sectionId);
            
            if (sectionId === 'certificate') {
              return (
                <div className="flipper-page-slot" key="slot-certificate">
                  <div className="report-page-a4" id="page-certificate">
                    <div 
                      className="certificate-scroll-container" 
                      style={{ 
                        height: '100%', 
                        overflowY: 'auto', 
                        padding: '1cm', 
                        fontFamily: "'Times New Roman', Times, serif",
                        fontSize: '16px',
                        lineHeight: 1.5,
                        color: 'black'
                      }}
                    >
                      {/* --- Header --- */}
                      <div 
                        style={{
                          textAlign: 'center',
                          borderBottom: '2px solid black',
                          paddingBottom: '10px',
                          marginBottom: '30px',
                          fontFamily: "'Arial', sans-serif"
                        }}
                      >
                        <h2 
                          style={{
                            margin: '5px 0',
                            fontSize: '20px',
                            color: '#003366', // Dark Blue
                            fontFamily: "'Arial', sans-serif",
                            fontWeight: 'bold'
                          }}
                        >
                          MOHAN BABU UNIVERSITY
                        </h2>
                        <p 
                          style={{
                            margin: 0,
                            fontSize: '16px',
                            color: 'black',
                            fontFamily: "'Arial', sans-serif"
                          }}
                        >
                          Tirupati-517102
                        </p>
                        <img 
                          src={mbuLogo} 
                          alt="MBU Logo" 
                          style={{
                            width: '60px',
                            marginTop: '10px'
                          }}
                        />
                      </div>
                      
                      {/* --- Content --- */}
                      <div style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                        <h3 
                          style={{
                            textDecoration: 'underline',
                            textAlign: 'center',
                            fontFamily: "'Arial', sans-serif",
                            marginBottom: '40px',
                            color: 'black',
                            fontSize: '18px',
                            fontWeight: 'bold'
                          }}
                        >
                          CERTIFICATE
                        </h3>
                        <div 
                          style={{
                            marginTop: '1cm',
                            textAlign: 'justify'
                          }}
                        >
                          <p>
                            This is to certify that the capstone project work entitled <strong style={{color: 'black'}}>"{certData.projectName || '[Project Title]'}"</strong> is a bonafide work done by <strong style={{color: 'black'}}>{selectedStudent.name || '[Student Name]'}</strong> (<strong style={{color: 'black'}}>{studentRollNo || '[Roll No]'}</strong>) of <strong style={{color: 'black'}}>{certData.degreeAwarded || '[Degree]'}</strong>, <strong style={{color: 'black'}}>Department of Computer Applications</strong>, in partial fulfillment of the requirements for the award of the degree of {certData.degreeAwarded || '[Degree]'}, Mohan Babu University, Tirupati during the academic year <strong style={{color: 'black'}}>{certData.batch || '[Year]'}</strong>.
                          </p>
                        </div>
                        <div 
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: '100px',
                            fontFamily: "'Arial', sans-serif",
                            color: 'black',
                            fontWeight: 'bold'
                          }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <strong style={{fontFamily: "'Arial', sans-serif"}}>PROJECT GUIDE</strong><br /><br /><br />
                            <strong style={{fontFamily: "'Arial', sans-serif"}}>{certData.guideName || '[Guide Name]'}</strong><br />
                            {certData.guideDesignation || '[Guide Designation]'}
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <strong style={{fontFamily: "'Arial', sans-serif"}}>HEAD OF THE DEPARTMENT</strong><br /><br /><br />
                            <strong style={{fontFamily: "'Arial', sans-serif"}}>{certData.hodName || '[HOD Name]'}</strong><br />
                            {certData.hodDesignation || '[HOD Designation]'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="page-footer-number">{currentPageNum}</div>
                  </div>
                </div>
              );
            }
            
            else if (sectionId === 'toc') {
              return (
                <div className="flipper-page-slot" key="slot-toc">
                  <div className="report-page-a4" id="page-toc">
                    <div className="page-content-scrollable">
                      <div className="cert-border-frame">
                        <h3 className="report-heading">TABLE OF CONTENTS</h3>
                        <ul className="toc-list">
                          {reportStructure.map((sec) => (
                            <React.Fragment key={sec.id}>
                              <li className="toc-item">
                                <span>{sec.title}</span>
                                <span>{getPageNumForSection(sec.id)}</span>
                              </li>
                              {sec.subsections.length > 0 && (
                                <ul className="toc-sub-list">
                                  {sec.subsections.map((sub) => (
                                    <li key={sub.id} className="toc-sub-item">
                                      <span>{sub.title}</span>
                                      <span>{getPageNumForSection(sub.id)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </React.Fragment>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="page-footer-number">{currentPageNum}</div>
                  </div>
                </div>
              );
            }
            
            else if (sectionId === 'bioData') {
              return (
                <div className="flipper-page-slot" key="slot-bioData">
                  <div className="report-page-a4" id="page-bioData">
                    <div className="page-content-scrollable resume-page">
                      <div className="resume-header">
                        <h1 className="resume-name">{bioData.name}</h1>
                        <p className="resume-contact">
                          {bioData.location} | {bioData.phone} | {bioData.email}
                          {bioData.github && ` | GitHub`}
                          {bioData.linkedin && ` | LinkedIn`}
                        </p>
                      </div>
                      <div className="resume-section">
                        <h2 className="resume-title">PROFESSIONAL SUMMARY</h2>
                        <p className="resume-body">{bioData.summary}</p>
                      </div>
                      <div className="resume-section">
                        <h2 className="resume-title">CORE TECHNICAL SKILLS</h2>
                        <ul className="resume-skills-list">
                          {(bioData.technicalSkills || []).map((skill, i) => <li key={i}>{skill}</li>)}
                        </ul>
                      </div>
                      <div className="resume-section">
                        <h2 className="resume-title">SOFT SKILLS</h2>
                        <ul className="resume-skills-list">
                          {(bioData.softSkills || []).map((skill, i) => <li key={i}>{skill}</li>)}
                        </ul>
                      </div>
                      <div className="resume-section">
                        <h2 className="resume-title">EXPERIENCE AND INTERNSHIP</h2>
                        {(bioData.experience || []).map((exp, i) => (
                          <div className="resume-item" key={i}>
                            <h3 className="resume-item-title">{exp.title}</h3>
                            <p className="resume-item-sub">{exp.company} | {exp.dates}</p>
                          </div>
                        ))}
                      </div>
                      <div className="resume-section">
                        <h2 className="resume-title">PROJECTS</h2>
                        {(bioData.projects || []).map((proj, i) => (
                          <div className="resume-item" key={i}>
                            <h3 className="resume-item-title">{proj.title}</h3>
                            <p className="resume-item-sub">{proj.tech}</p>
                            <p className="resume-body">{proj.description}</p>
                          </div>
                        ))}
                      </div>
                      <div className="resume-section">
                        <h2 className="resume-title">EDUCATION</h2>
                        {(bioData.education || []).map((edu, i) => (
                          <div className="resume-item" key={i}>
                            <h3 className="resume-item-title">{edu.degree}</h3>
                            <p className="resume-item-sub">{edu.university} | {edu.dates} | {edu.grade}</p>
                          </div>
                        ))}
                      </div>
                      <div className="resume-section">
                        <h2 className="resume-title">ACHIEVEMENTS AND CERTIFICATIONS</h2>
                        <ul className="resume-skills-list">
                          {(bioData.achievements || []).map((ach, i) => <li key={i}>{ach}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="page-footer-number">{currentPageNum}</div>
                  </div>
                </div>
              );
            }

            // --- This now handles ALL OTHER text/image sections ---
            else {
              const content = selectedProject?.sections?.[sectionId]?.content;
              const defaultText = getDefaultContent(sectionId);
              let contentPages = [];
              if (Array.isArray(content)) {
                contentPages = content.length > 0 ? content : [defaultText];
              } else if (content) {
                contentPages = [content];
              } else {
                contentPages = [defaultText];
              }
              const pageText = contentPages[subPageIndex] || '';

              const parentSection = parentTitle ? reportStructure.find(s => s.title === parentTitle) : null;
              const isFirstSubsection = parentSection && parentSection.subsections[0].id === sectionId;

              return (
                <div className="flipper-page-slot" key={`slot-${page.id}`}>
                  <div className="report-page-a4" id={`page-${page.id}`}>
                    <div className="page-content-scrollable">
                      <div className="cert-border-frame">
                        
                        {parentTitle && isFirstSubsection && subPageIndex === 0 && (
                          <h3 className="report-heading">
                            {parentTitle.toUpperCase()}
                          </h3>
                        )}
                        
                        {!parentTitle && subPageIndex === 0 && (
                          <h3 className="report-heading">
                            {title.toUpperCase()}
                          </h3>
                        )}

                        {parentTitle && (
                          <h4 className="report-sub-heading">
                            {title}
                          </h4>
                        )}

                        {subPageIndex > 0 && (
                          <div className="page-continuation-spacer"></div>
                        )}
                        
                        {sectionDef && sectionDef.inputType === 'image' ? (
                          <div className="preview-image-container">
                            {pageText ? (
                              <img src={pageText} alt={title} className="preview-image-full" />
                            ) : (
                              <p className="preview-image-placeholder">No image uploaded for this section.</p>
                            )}
                          </div>
                        ) : (
                          <p className="report-body" style={{ whiteSpace: 'pre-wrap' }}>
                            {pageText}
                          </p>
                        )}
                        
                      </div>
                    </div>
                    <div className="page-footer-number">{currentPageNum}</div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  };


  return (
    <div className="hod-dashboard">
      <header className="hod-header">
        <h1>HOD Dashboard</h1>
        <div className="header-controls">
          <button onClick={() => { setActiveTab('add-class'); setError(''); }} className="header-button">
            + Add Class
          </button>
          <div className="header-user-info">
            <span>Welcome, {user.name}</span>
            <button onClick={onLogout} className="logout-button">Logout</button>
          </div>
        </div>
      </header>

      <main className="hod-main">
        {/* --- TABS --- */}
        <div className="hod-tabs">
          <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setError(''); }}>Overview</button>
          <button className={`tab-button ${activeTab === 'all-students' ? 'active' : ''}`} onClick={() => { setActiveTab('all-students'); setError(''); }}>All Students</button>
          <button className={`tab-button ${activeTab === 'add-faculty' ? 'active' : ''}`} onClick={() => { setActiveTab('add-faculty'); setError(''); }}>Create Faculty</button>
          <button className={`tab-button ${activeTab === 'add-class' ? 'active' : ''}`} onClick={() => { setActiveTab('add-class'); setError(''); }}>Create Class</button>
        </div>

        {/* --- TAB CONTENT --- */}
        <div className="hod-tab-content">
          
          {/* --- Overview Tab --- */}
          {activeTab === 'overview' && (
            <div id="overview-tab" className="tab-pane">
              {loading && <p>Loading dashboard data...</p>}
              {error && <p className="form-error">{error}</p>}
              {!loading && (
                <div className="overview-container">
                  <div className="dashboard-column">
                    <h2 className="column-title">Class Dashboard</h2>
                    <div className="info-card-grid">
                      {classList.map(cls => (
                        <div key={cls.id} className="info-card">
                          <h3>{cls.name}</h3>
                          <p>{cls.department}</p>
                          <div className="info-card-stat">
                            <span>{cls.studentCount}</span> Students
                          </div>
                        </div>
                      ))}
                      {classList.length === 0 && <p style={{padding: '20px'}}>No classes created yet.</p>}
                    </div>
                  </div>
                  <div className="dashboard-column">
                    <h2 className="column-title">Faculty Dashboard</h2>
                    <div className="info-list">
                      {facultyList.map(faculty => (
                        <div key={faculty.uid} className="info-item">
                          <div>
                            <span className="item-name">{faculty.name}</span>
                            <span className="item-detail">{faculty.email}</span>
                          </div>
                          <div className="info-item-stat">
                            <span>{faculty.studentCount}</span> Students
                          </div>
                        </div>
                      ))}
                      {facultyList.length === 0 && <p style={{padding: '20px'}}>No faculty created yet.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- All Students Tab --- */}
          {activeTab === 'all-students' && (
            <div id="all-students-tab" className="tab-pane">
              <div className="search-bar-wrapper">
                <input 
                  type="search"
                  placeholder="Search by student name or roll number..."
                  className="search-input"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <div className="student-table-container">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Roll Number</th>
                      <th>Class</th>
                      <th>Faculty</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan="6">Loading...</td></tr>}
                    {!loading && filteredStudents.length === 0 && (
                      <tr><td colSpan="6">No students found.</td></tr>
                    )}
                    {filteredStudents.map(student => (
                      <tr key={student.uid}>
                        <td>{student.name}</td>
                        <td>{student.rollNumber}</td>
                        <td>{student.className}</td>
                        <td>{student.facultyName}</td>
                        <td>
                          <div className="progress-bar-container">
                            <div 
                              className="progress-bar-fill" 
                              style={{ width: `${student.status}` }}
                            ></div>
                          </div>
                          <span className="progress-text">{student.status}</span>
                        </td>
                        <td>
                          <button 
                            className="view-button" 
                            onClick={() => openProjectPreview(student)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- Add Faculty Tab --- */}
          {activeTab === 'add-faculty' && (
            <div id="add-faculty-tab" className="tab-pane form-pane">
              <form onSubmit={handleCreateFaculty} className="form-container">
                <h2>Create New Faculty</h2>
                {error && <p className="form-error">{error}</p>}
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-input" value={facultyName} onChange={(e) => setFacultyName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-input" value={facultyEmail} onChange={(e) => setFacultyEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="Min. 6 characters" className="form-input" value={facultyPassword} onChange={(e) => setFacultyPassword(e.target.value)} required />
                </div>
                <button type="submit" className="form-button submit-review" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Create Faculty'}
                </button>
              </form>
            </div>
          )}

          {/* --- Add Class Tab --- */}
          {activeTab === 'add-class' && (
            <div id="add-class-tab" className="tab-pane form-pane">
              <form onSubmit={handleCreateClass} className="form-container">
                <h2>Create New Class</h2>
                {error && <p className="form-error">{error}</p>}
                <div className="form-group">
                  <label>Class Name</label>
                  <input type="text" placeholder="e.g., MCA 2024-2026" className="form-input" value={className} onChange={(e) => setClassName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" placeholder="e.g., Dept. of Computer Applications" className="form-input" value={classDepartment} onChange={(e) => setClassDepartment(e.target.value)} required />
                </div>
                <button type="submit" className="form-button submit-review" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Create Class'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* --- Student Project Preview Modal --- */}
      {isPreviewOpen && (
        <div className="modal-overlay" onClick={closeProjectPreview}>
          <div className="modal-content-project" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="editor-title">
                Reviewing: {selectedStudent.name} ({selectedStudent.rollNumber})
              </h3>
              <button type="button" onClick={closeProjectPreview} className="modal-close-button">&times;</button>
            </div>
            
            <div className="modal-body-project">
              {error && <p className="form-error" style={{margin: '20px'}}>{error}</p>}
              <div className="review-container">
                {/* --- Sub-Column 1: Section List --- */}
                <div className="section-list-nav">
                  <h3 className="column-title">Project Status</h3>
                  <ul className="nav-list">
                    {reportStructure.map(section => {
                      const isNonEditable = !section.isPage && section.subsections.length > 0;
                      return (
                        <li key={section.id} className="nav-item-main">
                          <span className={`${isNonEditable ? 'non-editable' : ''}`}>
                            <span className="status-dot"></span>
                            {section.title}
                          </span>
                          {section.subsections.length > 0 && (
                            <ul className="nav-sub-list">
                              {section.subsections.map(sub => {
                                const status = getSectionStatus(sub.id);
                                return (
                                  <li key={sub.id} className={`nav-item-sub status-${status}`}>
                                    <span className="status-dot"></span>
                                    {sub.title}
                                    <span className="review-status">{status}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {section.isPage && section.subsections.length === 0 && (
                            <ul className="nav-sub-list">
                                <li className={`nav-item-sub status-${getSectionStatus(section.id)}`}>
                                  <span className="status-dot"></span>
                                  {section.title}
                                  <span className="review-status">{getSectionStatus(section.id)}</span>
                                </li>
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* --- Sub-Column 2: Page Preview --- */}
                <div className="preview-card">
                  <div className="preview-header">
                    <h2 className="card-title">Project Preview</h2>
                    <div className="preview-nav">
                      <button
                        className="preview-nav-button"
                        onClick={() => handlePreviewNav('prev')}
                        disabled={currentPageIndex === 0 || loadingProject || !selectedProject}
                      >
                        &larr;
                      </button>
                      <span>
                        Page {currentPageIndex + 1} of {totalPages}
                      </span>
                      <button
                        className="preview-nav-button"
                        onClick={() => handlePreviewNav('next')}
                        disabled={currentPageIndex === totalPages - 1 || loadingProject || !selectedProject}
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                  {renderPreview()}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}

export default HodDashboard;