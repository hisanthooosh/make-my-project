import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import './FacultyDashboard.css';
import MBU_Logo from '../assets/MBU_Logo.png';

// --- 1. REPORT STRUCTURE (Identical to StudentDashboard) ---
const reportStructure = [
  { id: 'titlePage', title: 'Title Page', isPage: true, subsections: [], inputType: 'form' },
  { id: 'certificate', title: 'Certificate (Text)', isPage: true, subsections: [], inputType: 'generated' },
  { id: 'certificateScan', title: 'Certificate (Scan)', isPage: true, subsections: [], inputType: 'image' },
  { id: 'acknowledgement', title: 'Acknowledgement', isPage: true, subsections: [] },
  { id: 'abstract', title: 'Abstract', isPage: true, subsections: [] },
  { id: 'orgInfo', title: 'Organization Information', isPage: true, subsections: [] },
  { id: 'methodologies', title: 'Methodologies', isPage: true, subsections: [] },
  { id: 'benefits', title: 'Benefits', isPage: true, subsections: [] },
  { id: 'toc', title: 'INDEX', isPage: true, subsections: [] },
  { id: 'weeklyOverview', title: 'Weekly Overview', isPage: true, subsections: [], inputType: 'weeklyTable' },
  {
    id: 'introduction',
    title: '1. Introduction',
    isPage: false,
    subsections: [
      { id: 'intro_main', title: '1.1 Introduction', isPage: true },
      { id: 'intro_modules', title: '1.2 Module Description', isPage: true },
    ]
  },
  { id: 'systemAnalysis', title: '2. System Analysis', isPage: true, subsections: [] },
  { id: 'srs', title: '3. Software Requirements', isPage: true, subsections: [] },
  { id: 'technology', title: '4. Technology', isPage: true, subsections: [] },
  { id: 'coding', title: '5. Coding', isPage: true, subsections: [] },
  { id: 'screenshots', title: '6. Screenshots', isPage: true, subsections: [], inputType: 'image' },
  { id: 'conclusion', title: '7. Conclusion', isPage: true, subsections: [] },
  { id: 'bibliography', title: '8. Bibliography', isPage: true, subsections: [] },
];

const allSections = reportStructure.flatMap(s =>
  s.subsections.length > 0 ? s.subsections : s
);

// --- Default Content Helper ---
const getDefaultContent = (sectionId) => {
  switch (sectionId) {
    case 'weeklyOverview':
      return [{ week: '1st Week', date: '', day: '', topic: 'Introduction to Internship' }];
    default:
      return '';
  }
};

const FacultyDashboard = ({ user, onLogout }) => {
  // --- State ---
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Review Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewSectionId, setReviewSectionId] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState('approved');

  // Preview State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const pdfPreviewRef = useRef(null);

  // --- Fetch Students on Mount ---
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/faculty/my-students');
        setStudents(data);
      } catch (err) {
        setError('Could not fetch students.');
      }
      setLoading(false);
    };
    fetchStudents();
  }, []);

  // --- Search Filter ---
  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (student.rollNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // --- Select Student & Fetch Project ---
  const handleSelectStudent = async (student) => {
    if (selectedStudent?.uid === student.uid) return;
    setSelectedStudent(student);
    setLoading(true);
    setProject(null);
    try {
      const { data } = await api.get(`/faculty/student-project/${student.uid}`);
      setProject(data);
      setCurrentPageIndex(0);
      setError('');
    } catch (err) {
      setError(`Could not fetch project for ${student.name}.`);
    }
    setLoading(false);
  };

  // --- Review Logic ---
  const openReviewModal = (sectionId) => {
    // Only open if section exists in project (or is initialized)
    const sectionData = project?.sections?.[sectionId];
    setReviewSectionId(sectionId);
    setReviewComment(sectionData?.comment || '');
    setReviewStatus(sectionData?.status === 'rejected' ? 'rejected' : 'approved');
    setIsModalOpen(true);
  };
  // --- NEW: Approve All Logic ---
  const handleApproveAll = async () => {
    if (!window.confirm("Are you sure? This will mark EVERY section in this report as APPROVED.")) return;

    setLoading(true);
    try {
      await api.post('/faculty/approve-all', {
        projectId: project.id
      });

      // Update Local State: Set all existing sections to 'approved'
      const updatedSections = { ...project.sections };
      Object.keys(updatedSections).forEach(key => {
        if (updatedSections[key]) {
          updatedSections[key] = { ...updatedSections[key], status: 'approved' };
        }
      });

      setProject(prev => ({ ...prev, sections: updatedSections }));

      // Update Student List Progress to 100%
      setStudents(prev => prev.map(s =>
        s.uid === selectedStudent.uid
          ? { ...s, progress: 100, overallStatus: 'approved' }
          : s
      ));

    } catch (err) {
      alert('Failed to approve project.');
      console.error(err);
    }
    setLoading(false);
  };
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: reviewData } = await api.post('/faculty/review-section', {
        projectId: project.id,
        sectionId: reviewSectionId,
        status: reviewStatus,
        comment: reviewComment
      });

      // Update Local Project State
      const updatedSections = {
        ...project.sections,
        [reviewSectionId]: {
          ...project.sections?.[reviewSectionId],
          status: reviewStatus,
          comment: reviewComment
        }
      };
      setProject(prev => ({ ...prev, sections: updatedSections }));

      // Update Student List Progress
      setStudents(prev => prev.map(s =>
        s.uid === selectedStudent.uid
          ? { ...s, progress: reviewData.newProgress, overallStatus: reviewData.newStatus }
          : s
      ));

      setIsModalOpen(false);
    } catch (err) {
      alert('Failed to submit review.');
    }
    setLoading(false);
  };

  // --- PROGRESS STATS (For Selected Student) ---
  const studentStats = useMemo(() => {
    if (!project) return null;
    const total = allSections.length;
    let approved = 0, pending = 0, draft = 0;

    allSections.forEach(sec => {
      const status = project.sections?.[sec.id]?.status || 'draft'; // default to draft if missing
      if (status === 'approved') approved++;
      else if (status === 'pending') pending++;
      else draft++;
    });

    return {
      approved: Math.round((approved / total) * 100),
      pending: Math.round((pending / total) * 100),
      draft: Math.round((draft / total) * 100),
      approvedCount: approved,
      pendingCount: pending
    };
  }, [project]);


  // --- PREVIEW LOGIC (Copied & Adapted from StudentDashboard) ---
  const allPages = useMemo(() => {
    const pages = [];
    if (!project || !selectedStudent) return [];

    reportStructure.forEach(section => {
      // 1. TOC
      if (section.id === 'toc') {
        pages.push({ id: 'toc_0', title: section.title, pageIndex: 0, sectionId: section.id });
        return;
      }

      // 2. Sections with Subsections
      if (!section.isPage && section.subsections.length > 0) {
        section.subsections.forEach(sub => {
          const content = project.sections?.[sub.id]?.content;
          const contentPages = Array.isArray(content) ? (content.length ? content : ['']) : (content ? [content] : [getDefaultContent(sub.id)]);
          contentPages.forEach((_, idx) => pages.push({ id: `${sub.id}_${idx}`, title: sub.title, pageIndex: idx, sectionId: sub.id, parentTitle: section.title }));
        });
        return;
      }

      // 3. Special Sections
      const content = project.sections?.[section.id]?.content;

      if (section.id === 'weeklyOverview') {
        const ROWS_PER_PAGE = 12;
        const data = Array.isArray(content) ? content : getDefaultContent('weeklyOverview');
        const pageCount = Math.ceil((data.length || 1) / ROWS_PER_PAGE);
        for (let i = 0; i < pageCount; i++) {
          pages.push({ id: `weeklyOverview_${i}`, title: section.title, pageIndex: i, sectionId: section.id });
        }
      }
      else if (section.inputType === 'image') {
        // Handle Multi-page Images (Screenshots) vs Single
        let count = 1;
        if (Array.isArray(content) && content.length > 0) count = content.length;
        else if (content && typeof content === 'string') count = 1;

        for (let i = 0; i < count; i++) {
          pages.push({ id: `${section.id}_${i}`, title: section.title, pageIndex: i, sectionId: section.id });
        }
      }
      else {
        // Standard Text
        let contentPages = Array.isArray(content) ? (content.length ? content : ['']) : (content ? [content] : [getDefaultContent(section.id)]);
        contentPages.forEach((_, idx) => pages.push({ id: `${section.id}_${idx}`, title: section.title, pageIndex: idx, sectionId: section.id }));
      }
    });
    return pages;
  }, [project, selectedStudent]);

  const totalPages = allPages.length;

  // --- RENDER PREVIEW CONTENT ---
  // --- RENDER PREVIEW CONTENT (Updated with Inline CSS from Student Dashboard) ---
  const renderPreviewContent = () => {
    if (!project || !selectedStudent) return <div className="empty-preview">Select a student to view their report.</div>;

    // --- 1. INLINE STYLES (Copied from StudentDashboard) ---
    const styles = {
      a4: { width: '794px', minHeight: '1123px', background: 'white', color: 'black', fontFamily: "'Times New Roman', serif", position: 'relative', boxSizing: 'border-box', margin: '0 auto 20px auto', padding: '40px' },
      borderFrame: { border: '4px double #000', width: '100%', height: '1020px', padding: '20px 10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center' },
      mainTitle: { fontSize: '24pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '15px' },
      subText: { fontSize: '14pt', fontStyle: 'italic', margin: '5px 0' },
      degreeText: { fontSize: '18pt', fontWeight: 'bold', marginTop: '10px' },
      nameText: { fontSize: '20pt', fontWeight: 'bold', color: '#000080', marginTop: '5px', textTransform: 'uppercase' },
      rollNoText: { fontSize: '16pt', fontWeight: 'bold', marginTop: '5px' },
      companySection: { fontSize: '16pt', fontWeight: 'bold', margin: '10px 0' },
      collegeSection: { marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
      deptName: { fontSize: '16pt', fontWeight: 'bold', color: '#800000', marginTop: '10px' },
      collegeName: { fontSize: '22pt', fontWeight: 'bold', color: '#800000', margin: '5px 0' },
      addressText: { fontSize: '12pt', fontWeight: 'bold' },
      yearText: { fontSize: '14pt', fontWeight: 'bold', marginTop: '5px' },
      table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '12pt' },
      th: { border: '1px solid black', padding: '8px', background: '#f2f2f2', fontWeight: 'bold' },
      td: { border: '1px solid black', padding: '8px', textAlign: 'left' }
    };

    // --- 2. PREPARE DATA ---
    // Try to get saved Title Page data, otherwise fallback to selectedStudent details
    const titlePageData = project.sections?.titlePage?.content || {
      studentName: selectedStudent.name,
      rollNo: selectedStudent.rollNumber,
      title: 'INTERNSHIP REPORT',
      subTitle: 'A report submitted in partial fulfillment of the requirements for the Award of Degree of',
      degree: 'MASTER OF COMPUTER APPLICATIONS',
      companyName: 'IBM', // Default fallback
      duration: 'July 2025 to August 2025',
      academicYear: '2024 - 2025'
    };

    return (
      <div className="preview-content-wrapper" ref={pdfPreviewRef}>
        <div className="preview-content-filmstrip" style={{ transform: `translateX(-${currentPageIndex * 100}%)` }}>
          {allPages.map((page, idx) => {
            const section = allSections.find(s => s.id === page.sectionId);
            const content = project.sections?.[page.sectionId]?.content;
            let pageContent = null;

            // --- PAGE RENDER LOGIC ---

            // 1. TITLE PAGE
            if (page.sectionId === 'titlePage') {
              const data = content || titlePageData;
              pageContent = (
                <div style={styles.borderFrame}>
                  <div><div style={styles.mainTitle}>{data.title}</div><div style={styles.subText}>{data.subTitle}</div><div style={styles.degreeText}>{data.degree}</div></div>
                  <div><div style={{ fontSize: '14pt', margin: '10px 0' }}>by</div><div style={styles.nameText}>{data.studentName}</div><div style={styles.rollNoText}>{data.rollNo}</div></div>
                  <div><div style={{ fontSize: '14pt', margin: '10px 0' }}>in</div><div style={styles.companySection}>{data.companyName}</div><div style={{ fontSize: '12pt' }}>(Duration: {data.duration})</div></div>
                  <div style={styles.collegeSection}><img src={MBU_Logo} alt="MBU" style={{ width: '130px', height: 'auto' }} /><div style={styles.deptName}>DEPARTMENT OF COMPUTER APPLICATIONS</div><div style={styles.collegeName}>MOHAN BABU UNIVERSITY</div><div style={styles.addressText}>Sree Sainath Nagar, A. Rangampet, Tirupati - 517102</div><div style={styles.yearText}>{data.academicYear}</div></div>
                </div>
              );
            }
            // 2. CERTIFICATE (Text)
            else if (page.sectionId === 'certificate') {
              const data = titlePageData;
              pageContent = (
                <div style={styles.borderFrame}>
                  <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#800000', marginBottom: '5px' }}>DEPARTMENT OF COMPUTER APPLICATIONS</div>
                    <div style={{ fontSize: '20pt', fontWeight: 'bold', color: '#800000', marginBottom: '5px' }}>MOHAN BABU UNIVERSITY</div>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#000000' }}>TIRUPATI</div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '60px' }}><h2 style={{ fontSize: '24pt', fontWeight: 'bold', textDecoration: 'underline' }}>CERTIFICATE</h2></div>
                  <div style={{ padding: '0 40px', marginTop: '40px', textAlign: 'justify', lineHeight: '2.0', fontSize: '14pt' }}>
                    <p>This is to certify that the Internship report submitted by <span style={{ fontWeight: 'bold', color: '#000080' }}>{data.studentName}</span> (<span style={{ fontWeight: 'bold' }}>{data.rollNo}</span>) is work done by him/her and submitted during <span style={{ fontWeight: 'bold' }}>{data.academicYear}</span> academic year.</p>
                  </div>
                </div>
              );
            }
            // 3. CERTIFICATE (Scan)
            else if (page.sectionId === 'certificateScan') {
              const imgUrl = Array.isArray(content) ? content[page.pageIndex] : content;
              pageContent = (<div style={{ ...styles.borderFrame, justifyContent: 'center', padding: '20px' }}>{imgUrl ? <img src={imgUrl} alt="Cert" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ textAlign: 'center' }}><h3>SIGNED CERTIFICATE SCAN</h3><p>No image uploaded.</p></div>}</div>);
            }
            // 4. ACKNOWLEDGEMENT
            else if (page.sectionId === 'acknowledgement') {
              const data = titlePageData;
              pageContent = (
                <div style={{ ...styles.borderFrame, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '40px' }}>
                  <h2 style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '30px', textTransform: 'uppercase' }}>ACKNOWLEDGEMENT</h2>
                  <div style={{ fontSize: '11pt', lineHeight: '1.8', textAlign: 'justify' }}>
                    <p style={{ marginBottom: '10px' }}>I express my deep sense of gratitude to our beloved chancellor <strong>Dr. M. Mohan Babu</strong>, Padma Shri awardee for his encouragement throughout the program.</p>
                    <p style={{ marginBottom: '10px' }}>I would like to thank <strong>{data.companyName}</strong> for giving me the opportunity to do an internship.</p>
                    <p>(...Student's full acknowledgement text...)</p>
                  </div>
                  <div style={{ marginTop: 'auto', alignSelf: 'flex-end', textAlign: 'right', fontWeight: 'bold', fontSize: '13pt' }}>
                    <div style={{ textTransform: 'uppercase' }}>{data.studentName}</div>
                    <div>({data.rollNo})</div>
                  </div>
                </div>
              );
            }
            // 5. WEEKLY OVERVIEW
            else if (page.sectionId === 'weeklyOverview') {
              const ROWS_PER_PAGE = 12;
              const allRows = Array.isArray(content) ? content : getDefaultContent('weeklyOverview');
              const start = page.pageIndex * ROWS_PER_PAGE;
              const end = start + ROWS_PER_PAGE;
              const pageRows = allRows.slice(start, end);
              pageContent = (
                <div style={{ ...styles.borderFrame, justifyContent: 'flex-start', paddingTop: '40px' }}>
                  <h3 style={{ fontSize: '18pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '20px', textTransform: 'uppercase' }}>
                    {page.pageIndex === 0 ? 'WEEKLY OVERVIEW' : 'WEEKLY OVERVIEW (Cont.)'}
                  </h3>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, width: '15%' }}>Week</th>
                        <th style={{ ...styles.th, width: '20%' }}>Date / Day</th>
                        <th style={styles.th}>Topic / Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>{r.week}</td>
                          <td style={styles.td}><div style={{ fontWeight: 'bold' }}>{r.date}</div><div style={{ fontStyle: 'italic', fontSize: '10pt' }}>{r.day}</div></td>
                          <td style={styles.td}>{r.topic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            // 6. INDEX (TOC)
            else if (page.sectionId === 'toc') {
              // Note: Dynamic TOC generation logic can be added here if needed, 
              // for now we use a placeholder styling matching the others
              pageContent = (<div style={{ ...styles.borderFrame, justifyContent: 'flex-start' }}><h2 style={{ textAlign: 'center', fontSize: '20pt', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>INDEX</h2><p style={{ textAlign: 'center', marginTop: '20px' }}>Table of contents will be generated here.</p></div>);
            }
            // 7. GENERAL SECTIONS (Abstract, Intro, etc.)
            else {
              const text = Array.isArray(content) ? content[page.pageIndex] : (content || getDefaultContent(page.sectionId));
              const isImageSection = section.inputType === 'image';
              const imgUrl = Array.isArray(content) ? content[page.pageIndex] : content;

              // Handle Subheading Styling vs Main Heading Styling
              const isSubHeadingPage = ['orgInfo', 'methodologies', 'benefits'].includes(page.sectionId);
              const titleStyle = isSubHeadingPage
                ? { textAlign: 'left', fontSize: '14pt', fontWeight: 'bold', marginBottom: '20px' }
                : { textAlign: 'center', fontSize: '18pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '30px', textTransform: 'uppercase' };

              pageContent = (
                <div style={{ ...styles.borderFrame, justifyContent: 'flex-start', alignItems: 'stretch', padding: '40px' }}>
                  {page.pageIndex === 0 && <h3 style={titleStyle}>{page.parentTitle ? page.parentTitle : page.title}</h3>}
                  {page.parentTitle && page.pageIndex === 0 && <h4 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '15px' }}>{page.title}</h4>}

                  {isImageSection ?
                    <div style={{ textAlign: 'center' }}>{imgUrl ? <img src={imgUrl} alt="Diagram" style={{ maxWidth: '100%', maxHeight: '800px' }} /> : 'No image uploaded'}</div>
                    : <div style={{ fontSize: '13pt', lineHeight: '1.8', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{text}</div>
                  }
                </div>
              );
            }

            return (
              <div key={idx} className="flipper-page-slot">
                <div className="report-page-a4" style={styles.a4}>
                  {pageContent}
                  {idx > 2 && <div style={{ position: 'absolute', bottom: '30px', left: '0', width: '100%', textAlign: 'center' }}>{idx - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const handlePreviewNav = (dir) => {
    if (dir === 'next' && currentPageIndex < totalPages - 1) setCurrentPageIndex(currentPageIndex + 1);
    if (dir === 'prev' && currentPageIndex > 0) setCurrentPageIndex(currentPageIndex - 1);
  };

  return (
    <div className="faculty-dashboard">
      {/* --- Header --- */}
      <header className="faculty-header">
        <div className="header-left">
          <h1>Faculty Dashboard</h1>
        </div>
        <div className="header-right">
          <div className="user-profile">
            <span className="user-name">{user.name}</span>
            <span className="user-role">Faculty ID: {user.facultyId}</span>
          </div>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <main className="faculty-main">
        {/* --- Sidebar: Student List --- */}
        <aside className="sidebar-student-list">
          <div className="sidebar-header">
            <h2>My Students</h2>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search Name or Roll No..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="student-scroll-list">
            {filteredStudents.length === 0 && !loading && <div className="empty-state">No students found.</div>}

            {filteredStudents.map(student => (
              <div
                key={student.uid}
                className={`student-card ${selectedStudent?.uid === student.uid ? 'active' : ''}`}
                onClick={() => handleSelectStudent(student)}
              >
                <div className="student-avatar">{student.name.charAt(0)}</div>
                <div className="student-info">
                  <h4>{student.name}</h4>
                  <p>{student.rollNumber}</p>
                </div>
                {/* Status Dot */}
                <div className={`status-indicator ${student.overallStatus || 'draft'}`}></div>
              </div>
            ))}
          </div>
        </aside>

        {/* --- Main Workspace --- */}
        <section className="workspace-area">
          {selectedStudent && project ? (
            <>
              {/* Top Bar: Student Stats */}
              <div className="workspace-top-bar">
                <div className="student-meta">
                  <h2>{selectedStudent.name}</h2>
                  <span className="badge-roll">{selectedStudent.rollNumber}</span>
                </div>

                {/* --- NEW: APPROVE ALL BUTTON --- */}
                <div style={{ marginLeft: 'auto', marginRight: '20px' }}>
                  <button
                    onClick={handleApproveAll}
                    disabled={loading}
                    className="approve-all-btn"
                    style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {loading ? 'Processing...' : '✓ Approve Complete Project'}
                  </button>
                </div>
                {/* ------------------------------- */}

                {studentStats && (
                  <div className="progress-pills">
                    <div className="pill pending">Pending: {studentStats.pendingCount}</div>
                    <div className="pill approved">Approved: {studentStats.approvedCount}</div>
                    <div className="pill draft">Drafting: {studentStats.draft}%</div>
                  </div>
                )}
              </div>

              {/* Split View: Navigation & Preview */}
              <div className="workspace-content">

                {/* 1. Project Navigation (Left) */}
                <div className="project-nav-panel">
                  <h3>Report Sections</h3>
                  <div className="nav-tree">
                    {reportStructure.map(section => (
                      <div key={section.id} className="nav-group">
                        <div className="nav-group-title">{section.title}</div>

                        {/* Subsections or Main Section if Page */}
                        {section.subsections.length > 0 ? (
                          <div className="nav-sub-items">
                            {section.subsections.map(sub => {
                              const status = project.sections?.[sub.id]?.status || 'draft';
                              return (
                                <div key={sub.id} className={`nav-item status-${status}`} onClick={() => openReviewModal(sub.id)}>
                                  <span className="nav-item-title">{sub.title}</span>
                                  <span className="nav-item-status">{status}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          section.isPage && (
                            <div className="nav-sub-items">
                              <div className={`nav-item status-${project.sections?.[section.id]?.status || 'draft'}`} onClick={() => openReviewModal(section.id)}>
                                <span className="nav-item-title">{section.title}</span>
                                <span className="nav-item-status">{project.sections?.[section.id]?.status || 'draft'}</span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Live Preview (Right) */}
                <div className="preview-panel">
                  <div className="preview-toolbar">
                    <span>Page {currentPageIndex + 1} / {totalPages}</span>
                    <div className="nav-buttons">
                      <button onClick={() => handlePreviewNav('prev')} disabled={currentPageIndex === 0}>Previous</button>
                      <button onClick={() => handlePreviewNav('next')} disabled={currentPageIndex === totalPages - 1}>Next</button>
                    </div>
                  </div>
                  <div className="preview-canvas">
                    {renderPreviewContent()}
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="workspace-empty">
              <div className="empty-content">
                <div className="empty-icon">📂</div>
                <h3>Select a student to begin review</h3>
                <p>Choose a student from the sidebar to view their report progress, review sections, and provide feedback.</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* --- Review Modal --- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reviewing: {allSections.find(s => s.id === reviewSectionId)?.title}</h3>
              <button onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="status-selector">
                <label className={`radio-label ${reviewStatus === 'approved' ? 'selected-approved' : ''}`}>
                  <input type="radio" name="status" value="approved" checked={reviewStatus === 'approved'} onChange={e => setReviewStatus(e.target.value)} />
                  Approve
                </label>
                <label className={`radio-label ${reviewStatus === 'rejected' ? 'selected-rejected' : ''}`}>
                  <input type="radio" name="status" value="rejected" checked={reviewStatus === 'rejected'} onChange={e => setReviewStatus(e.target.value)} />
                  Request Changes (Reject)
                </label>
              </div>
              <label className="comment-label">Feedback / Comments</label>
              <textarea
                className="review-textarea"
                placeholder="Write your feedback here..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsModalOpen(false)} className="cancel-btn">Cancel</button>
              <button onClick={handleSubmitReview} className="submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;