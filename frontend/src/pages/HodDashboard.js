import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import './HodDashboard.css'; // This is the new CSS file
import mbuLogo from '../assets/MBU_Logo.png';

// --- 1. REPLACEMENT: NEW REPORT STRUCTURE ---
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

const allSections = reportStructure.flatMap(s => s.subsections.length > 0 ? s.subsections : s);

// --- Helper: Default Content to prevent crashes ---
const getDefaultContent = (sectionId) => {
  if (sectionId === 'weeklyOverview') return [{ week: '1st Week', date: '', day: '', topic: 'Introduction' }];
  return '';
};

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
  // --- PASTE THESE 2 FUNCTIONS INSIDE YOUR FacultyDashboard COMPONENT ---

  // Helper to render text with line breaks
  const renderWithBreaks = (text = '') => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  // Helper to render skills with inline styles
  const renderSkills = (skills = '') => {
    return (
      <ul style={{ paddingLeft: '20px', margin: '0' }}>
        {skills.split(',').map((skill, index) => (
          skill.trim() ? (
            <li key={index} style={{ marginBottom: '5px' }}>
              {skill.trim()}
            </li>
          ) : null
        ))}
      </ul>
    );
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
  // --- Handle Delete Student ---
  const handleDeleteStudent = async (studentId, studentName) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE student "${studentName}"? This cannot be undone.`)) {
      try {
        await api.delete(`/hod/delete-student/${studentId}`);

        // Remove the student from the local list so the table updates instantly
        setStudentList(prev => prev.filter(s => s.uid !== studentId));
        alert('Student deleted successfully.');
      } catch (err) {
        console.error(err);
        alert('Failed to delete student. ' + (err.response?.data?.message || ''));
      }
    }
  };

  const closeProjectPreview = () => {
    setIsPreviewOpen(false);
    setSelectedStudent(null);
    setSelectedProject(null);
    setError('');
  };

  // --- 2. REPLACEMENT: PAGE CALCULATION LOGIC ---
  const allPages = useMemo(() => {
    const pages = [];
    if (!selectedProject || !selectedStudent) return [];

    // Use selectedProject as the source
    const project = selectedProject;

    reportStructure.forEach(section => {
      // 1. TOC
      if (section.id === 'toc') {
        pages.push({ id: 'toc_0', title: section.title, pageIndex: 0, sectionId: section.id });
        return;
      }

      // 2. Sections with Subsections (Introduction, etc.)
      if (!section.isPage && section.subsections.length > 0) {
        section.subsections.forEach(sub => {
          const content = project.sections?.[sub.id]?.content;
          const contentPages = Array.isArray(content) ? (content.length ? content : ['']) : (content ? [content] : [getDefaultContent(sub.id)]);
          contentPages.forEach((_, idx) => pages.push({ id: `${sub.id}_${idx}`, title: sub.title, pageIndex: idx, sectionId: sub.id, parentTitle: section.title }));
        });
        return;
      }

      // 3. Special Sections (Weekly, Images, Normal Pages)
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
        let count = 1;
        if (Array.isArray(content) && content.length > 0) count = content.length;
        else if (content && typeof content === 'string') count = 1;

        for (let i = 0; i < count; i++) {
          pages.push({ id: `${section.id}_${i}`, title: section.title, pageIndex: i, sectionId: section.id });
        }
      }
      else {
        let contentPages = Array.isArray(content) ? (content.length ? content : ['']) : (content ? [content] : [getDefaultContent(section.id)]);
        contentPages.forEach((_, idx) => pages.push({ id: `${section.id}_${idx}`, title: section.title, pageIndex: idx, sectionId: section.id }));
      }
    });
    return pages;
  }, [selectedProject, selectedStudent]);

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

  // --- 3. REPLACEMENT: RENDER PREVIEW (A4 STYLE) ---
  const renderPreview = () => {
    if (loadingProject) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Project...</div>;
    if (!selectedProject) return <div style={{ padding: '20px', textAlign: 'center' }}>No project data found.</div>;
    if (!selectedStudent) return null;

    const project = selectedProject;

    // Standard Styles from Student/Faculty Dashboard
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

    const titlePageData = project.sections?.titlePage?.content || {
      studentName: selectedStudent.name, rollNo: selectedStudent.rollNumber,
      title: 'INTERNSHIP REPORT', subTitle: 'A report submitted...', degree: 'MCA',
      companyName: 'IBM', duration: 'July to Aug', academicYear: '2024 - 2025'
    };

    return (
      <div className="preview-content-wrapper" ref={pdfPreviewRef}>
        <div className="preview-content-filmstrip" style={{ transform: `translateX(-${currentPageIndex * 100}%)` }}>
          {allPages.map((page, idx) => {
            const section = allSections.find(s => s.id === page.sectionId);
            const content = project.sections?.[page.sectionId]?.content;
            let pageContent = null;

            if (page.sectionId === 'titlePage') {
              const data = content || titlePageData;
              pageContent = (
                <div style={styles.borderFrame}>
                  <div><div style={styles.mainTitle}>{data.title}</div><div style={styles.subText}>{data.subTitle}</div><div style={styles.degreeText}>{data.degree}</div></div>
                  <div><div style={{ fontSize: '14pt', margin: '10px 0' }}>by</div><div style={styles.nameText}>{data.studentName}</div><div style={styles.rollNoText}>{data.rollNo}</div></div>
                  <div><div style={{ fontSize: '14pt', margin: '10px 0' }}>in</div><div style={styles.companySection}>{data.companyName}</div><div style={{ fontSize: '12pt' }}>(Duration: {data.duration})</div></div>
                  <div style={styles.collegeSection}><img src={mbuLogo} alt="MBU" style={{ width: '130px', height: 'auto' }} /><div style={styles.deptName}>DEPARTMENT OF COMPUTER APPLICATIONS</div><div style={styles.collegeName}>MOHAN BABU UNIVERSITY</div><div style={styles.addressText}>Tirupati - 517102</div><div style={styles.yearText}>{data.academicYear}</div></div>
                </div>
              );
            }
            // --- REPLACEMENT: CERTIFICATE (TEXT) ---
            else if (page.sectionId === 'certificate') {
              const data = titlePageData;
              pageContent = (
                <div style={styles.borderFrame}>
                  <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#800000', marginBottom: '5px' }}>DEPARTMENT OF COMPUTER APPLICATIONS</div>
                    <div style={{ fontSize: '20pt', fontWeight: 'bold', color: '#800000', marginBottom: '5px' }}>MOHAN BABU UNIVERSITY</div>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#000000' }}>TIRUPATI</div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '60px' }}>
                    <h2 style={{ fontSize: '24pt', fontWeight: 'bold', textDecoration: 'underline', color: '#000000' }}>CERTIFICATE</h2>
                  </div>
                  <div style={{ padding: '0 40px', marginTop: '40px', textAlign: 'justify', lineHeight: '2.0', fontSize: '14pt' }}>
                    <p style={{ margin: 0 }}>
                      This is to certify that the Internship report submitted by
                      <span style={{ fontWeight: 'bold', color: '#000080' }}> {data.studentName || '[Student Name]'} </span>
                      (<span style={{ fontWeight: 'bold' }}>{data.rollNo || '[Roll No]'}</span>)
                      is work done by him/her and submitted during
                      <span style={{ fontWeight: 'bold' }}> {data.academicYear || '2024 - 2025'} </span>
                      academic year, in partial fulfillment of the requirements for the award of the degree of
                      <span style={{ fontWeight: 'bold' }}> MASTER OF COMPUTER APPLICATIONS </span>
                      at
                      <span style={{ fontWeight: 'bold' }}> {data.companyName || 'IBM'} </span>
                      (Duration: <span style={{ fontWeight: 'bold' }}>{data.duration || 'July to Aug'}</span>).
                    </p>
                  </div>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 40px', marginTop: '150px', marginBottom: '60px', fontSize: '12pt', fontWeight: 'bold' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div>Department Internship Coordinator</div>
                      <div style={{ marginTop: '60px' }}>Ms. Peddinti Neeraja,</div>
                      <div style={{ fontWeight: 'normal' }}>Assistant Professor,</div>
                      <div style={{ fontWeight: 'normal' }}>Department of CA</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>Head of the Department</div>
                      <div style={{ marginTop: '60px' }}>Dr. M. Sowmya Vani,</div>
                      <div style={{ fontWeight: 'normal' }}>Professor and Head,</div>
                      <div style={{ fontWeight: 'normal' }}>Department of CA</div>
                    </div>
                  </div>
                </div>
              );
            }
            else if (page.sectionId === 'certificateScan') {
              const imgUrl = Array.isArray(content) ? content[page.pageIndex] : content;
              pageContent = (<div style={{ ...styles.borderFrame, justifyContent: 'center', padding: '20px' }}>{imgUrl ? <img src={imgUrl} alt="Cert" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ textAlign: 'center' }}><h3>CERTIFICATE SCAN</h3><p>No image.</p></div>}</div>);
            }
            // --- REPLACEMENT: ACKNOWLEDGEMENT PAGE ---
            else if (page.sectionId === 'acknowledgement') {
              const data = titlePageData;
              pageContent = (
                <div style={{ ...styles.borderFrame, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', padding: '40px' }}>

                  {/* Title */}
                  <h2 style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '30px', marginTop: '10px', textTransform: 'uppercase' }}>ACKNOWLEDGEMENT</h2>

                  {/* Body Text */}
                  <div style={{ fontSize: '11pt', lineHeight: '1.8', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                    <p style={{ marginBottom: '15px' }}>This acknowledgement transcends the reality of formality when I would like to express my deep gratitude and respect to all those people behind the screen who guided, inspired and helped me for the completion of my internship.</p>

                    <p style={{ marginBottom: '10px' }}>I express my deep sense of gratitude to our beloved chancellor <strong>Dr. M. Mohan Babu</strong>, Padma Shri awardee for his encouragement throughout the program.</p>

                    <p style={{ marginBottom: '10px' }}>I express my deep sense of gratitude to our beloved vice-chancellor <strong>Dr. Nagaraj Ramrao</strong>, for his encouragement throughout the program.</p>

                    <p style={{ marginBottom: '10px' }}>I owe my gratitude and special thanks to the Dean <strong>Dr. Babu DevasenaPati</strong>, for his special encouragement and advice to shape myself for the future career.</p>

                    <p style={{ marginBottom: '10px' }}>I am extremely thankful to <strong>Dr. M. Sowmya Vani</strong>, HOD, and Department of Computer Applications for all provisions made and for her constant encouragement throughout my work.</p>

                    <p style={{ marginBottom: '10px' }}>I would like to thank <strong>{data.companyName || 'the company'}</strong> for giving me the opportunity to do an internship within the organization.</p>

                    <p style={{ marginBottom: '10px' }}>I wish to express my deep sense of gratitude to my Internship Coordinator <strong>Ms. Peddinti Neeraja</strong>, Associate Professor, Department of Computer Applications for extending her valuable co-operation, moral support, kind attention, guidance, suggestions, and encouragement to complete my Project Work successfully.</p>

                    <p style={{ marginBottom: '10px' }}>I thank all my beloved Faculty, Department of CA for giving their valuable suggestions and maximum co-operation.</p>

                    <p style={{ marginBottom: '10px' }}>I owe a deep sense of gratitude to my beloved Parents in extending their moral support in this Endeavour.</p>

                    <p>I would like to thank all my friends who extended their help, encouragement and moral support either directly or indirectly in completing my internship.</p>
                  </div>

                  {/* Name & Roll No (Pushed to Bottom Right) */}
                  <div style={{
                    marginTop: 'auto',
                    alignSelf: 'flex-end',
                    textAlign: 'right',
                    fontSize: '13pt',
                    fontWeight: 'bold',
                    marginBottom: '20px'
                  }}>
                    <div style={{ textTransform: 'uppercase' }}>{data.studentName}</div>
                    <div>({data.rollNo})</div>
                  </div>
                </div>
              );
            }
            // --- REPLACEMENT: BENEFITS PAGE ---
            else if (page.sectionId === 'benefits') {
              const text = Array.isArray(content) ? content[page.pageIndex] : (content || getDefaultContent(page.sectionId));

              pageContent = (
                <div style={{ ...styles.borderFrame, justifyContent: 'flex-start', alignItems: 'stretch', padding: '40px' }}>
                  {page.pageIndex === 0 && (
                    <h3 style={{
                      textAlign: 'left',
                      fontSize: '14pt',
                      fontWeight: 'bold',
                      marginBottom: '20px',
                      marginTop: '0px',
                      width: '100%'
                    }}>
                      Benefits of the Company/Institution through our report
                    </h3>
                  )}

                  <div style={{ fontSize: '13pt', lineHeight: '1.8', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                    {text}
                  </div>
                </div>
              );
            }
            // --- REPLACEMENT: INDEX (Dynamic Table of Contents) ---
            else if (page.sectionId === 'toc') {
              // 1. Define which sections strictly belong in the TOC (starting from Acknowledgement)
              const tocRows = [];
              let startCollecting = false;

              // Helper to find the page number in your 'allPages' list
              const findPageNumber = (id) => {
                const foundIdx = allPages.findIndex(p => p.sectionId === id);
                // Logic: Page count starts after the first 3 pages (Title, Cert, Scan) -> idx 3 = Page 1
                if (foundIdx > 2) return foundIdx - 2;
                return ''; // Don't show number if it's one of the first 3 unnumbered pages
              };

              // 2. Loop through the structure to build the table rows
              reportStructure.forEach(sect => {
                // Start collecting only from 'acknowledgement'
                if (sect.id === 'acknowledgement') startCollecting = true;

                if (startCollecting) {
                  // If it has subsections (like Introduction 1.1, 1.2), list them
                  if (sect.subsections && sect.subsections.length > 0) {
                    // List the Main Header (e.g., "1. Introduction") pointing to first subsection
                    const firstSubPage = findPageNumber(sect.subsections[0].id);
                    if (firstSubPage) {
                      tocRows.push({ title: sect.title, page: firstSubPage, isMain: true });
                    }
                  }
                  else {
                    // Regular sections (Abstract, Benefits, etc.)
                    const pNum = findPageNumber(sect.id);
                    // Don't list the TOC itself in the TOC
                    if (sect.id !== 'toc' && pNum) {
                      tocRows.push({ title: sect.title, page: pNum, isMain: true });
                    }
                  }
                }
              });

              pageContent = (
                <div style={{ ...styles.borderFrame, justifyContent: 'flex-start' }}>
                  <h2 style={{
                    textAlign: 'center',
                    fontSize: '20pt',
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    marginBottom: '30px',
                    textTransform: 'uppercase'
                  }}>
                    INDEX
                  </h2>

                  <div style={{ width: '100%', padding: '0 20px' }}>
                    {/* Table Header */}
                    <div style={{ display: 'flex', borderBottom: '2px solid black', paddingBottom: '5px', marginBottom: '10px', fontWeight: 'bold' }}>
                      <div style={{ flex: 1, textAlign: 'left', fontSize: '14pt' }}>Topic</div>
                      <div style={{ width: '80px', textAlign: 'right', fontSize: '14pt' }}>Page No</div>
                    </div>

                    {/* Table Rows */}
                    {tocRows.map((row, rIdx) => (
                      <div key={rIdx} style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        marginBottom: '12px',
                        fontSize: '13pt'
                      }}>
                        {/* Topic Name with dots spacer */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                          <span style={{ fontWeight: row.isMain ? 'bold' : 'normal', background: '#fff', paddingRight: '5px', zIndex: 1 }}>
                            {row.title}
                          </span>
                          {/* Dotted Leader Line */}
                          <span style={{ flex: 1, borderBottom: '1px dotted #000', marginBottom: '5px', marginLeft: '5px' }}></span>
                        </div>

                        {/* Page Number */}
                        <div style={{ width: '60px', textAlign: 'right', paddingLeft: '10px', background: '#fff', zIndex: 1 }}>
                          {row.page}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            // --- REPLACEMENT: WEEKLY OVERVIEW ---
            else if (page.sectionId === 'weeklyOverview') {
              const ROWS_PER_PAGE = 12;
              const allRows = Array.isArray(content) ? content : getDefaultContent('weeklyOverview');

              // SLICE DATA: Only show rows for this specific page
              const start = page.pageIndex * ROWS_PER_PAGE;
              const end = start + ROWS_PER_PAGE;
              const pageRows = allRows.slice(start, end);

              pageContent = (
                <div style={{
                  ...styles.borderFrame,
                  justifyContent: 'flex-start',
                  paddingTop: '40px'
                }}>
                  <h3 style={{
                    fontSize: '18pt',
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    marginBottom: '20px',
                    textTransform: 'uppercase'
                  }}>
                    {page.pageIndex === 0 ? 'WEEKLY OVERVIEW' : 'WEEKLY OVERVIEW (Cont.)'}
                  </h3>

                  <table style={{ ...styles.table, marginTop: '10px', fontSize: '11pt' }}>
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
                          <td style={styles.td}>
                            <div style={{ fontWeight: 'bold' }}>{r.date}</div>
                            <div style={{ fontSize: '10pt', fontStyle: 'italic' }}>{r.day}</div>
                          </td>
                          <td style={styles.td}>{r.topic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            else {
              const text = Array.isArray(content) ? content[page.pageIndex] : (content || getDefaultContent(page.sectionId));
              const isImage = section.inputType === 'image';
              const imgUrl = Array.isArray(content) ? content[page.pageIndex] : content;
              const isSubHeading = ['orgInfo', 'methodologies', 'benefits'].includes(page.sectionId);
              const titleStyle = isSubHeading ? { textAlign: 'left', fontSize: '14pt', fontWeight: 'bold', marginBottom: '20px' } : { textAlign: 'center', fontSize: '18pt', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '30px', textTransform: 'uppercase' };

              pageContent = (
                <div style={{ ...styles.borderFrame, justifyContent: 'flex-start', alignItems: 'stretch', padding: '40px' }}>
                  {page.pageIndex === 0 && <h3 style={titleStyle}>{page.parentTitle ? page.parentTitle : page.title}</h3>}
                  {isImage ? <div style={{ textAlign: 'center' }}>{imgUrl ? <img src={imgUrl} alt="Diagram" style={{ maxWidth: '100%', maxHeight: '800px' }} /> : 'No image'}</div>
                    : <div style={{ fontSize: '13pt', lineHeight: '1.8', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{text}</div>}
                </div>
              );
            }
            return (<div key={idx} className="flipper-page-slot"><div className="report-page-a4" style={styles.a4}>{pageContent}{idx > 2 && <div style={{ position: 'absolute', bottom: '30px', left: '0', width: '100%', textAlign: 'center' }}>{idx - 2}</div>}</div></div>);
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
                      {classList.length === 0 && <p style={{ padding: '20px' }}>No classes created yet.</p>}
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
                      {facultyList.length === 0 && <p style={{ padding: '20px' }}>No faculty created yet.</p>}
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
                      <th>Email</th> {/* New Column */}
                      <th>Roll Number</th>
                      <th>Class</th>
                      <th>Faculty</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan="7">Loading...</td></tr>}
                    {!loading && filteredStudents.length === 0 && (
                      <tr><td colSpan="7">No students found.</td></tr>
                    )}
                    {filteredStudents.map(student => (
                      <tr key={student.uid}>
                        <td>{student.name}</td>
                        {/* New Email Column - shows email so you can help them */}
                        <td style={{ fontSize: '0.9em', color: '#555' }}>{student.email}</td>
                        <td>{student.rollNumber}</td>
                        <td>{student.className}</td>
                        <td>{student.facultyName}</td>
                        <td>
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${student.status === 'Completed' ? '100%' : student.status}` }}
                            ></div>
                          </div>
                          <span className="progress-text">{student.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              className="view-button"
                              onClick={() => openProjectPreview(student)}
                            >
                              View
                            </button>
                            {/* New Delete Button */}
                            <button
                              className="view-button" // You can style this differently if you want, e.g., create a .delete-button class
                              style={{ backgroundColor: '#dc3545' }} // Red color for danger
                              onClick={() => handleDeleteStudent(student.uid, student.name)}
                            >
                              Delete
                            </button>
                          </div>
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

      {/* --- 4. REPLACEMENT: MODAL WITH SIDEBAR & PREVIEW --- */}
      {isPreviewOpen && (
        <div className="modal-overlay" onClick={closeProjectPreview}>
          <div className="modal-content" style={{ width: '95%', maxWidth: '1400px', height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reviewing: {selectedStudent.name}</h3>
              <button onClick={closeProjectPreview}>X</button>
            </div>

            {/* Split View Container */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* LEFT: Sidebar (Report Sections & Status) */}
              <div className="project-nav-panel" style={{ width: '250px', borderRight: '1px solid #ddd', overflowY: 'auto', padding: '15px', background: '#f9f9f9' }}>
                <h4 style={{ marginBottom: '15px', borderBottom: '2px solid #333', paddingBottom: '5px' }}>Report Sections</h4>
                <div className="nav-tree">
                  {reportStructure.map(section => (
                    <div key={section.id} className="nav-group" style={{ marginBottom: '10px' }}>
                      <div className="nav-group-title" style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{section.title}</div>

                      {section.subsections.length > 0 ? (
                        <div className="nav-sub-items" style={{ paddingLeft: '10px' }}>
                          {section.subsections.map(sub => {
                            const status = selectedProject?.sections?.[sub.id]?.status || 'pending';
                            const color = status === 'approved' ? '#10b981' : (status === 'rejected' ? '#ef4444' : '#f59e0b');
                            return (
                              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', fontSize: '13px', padding: '5px 0', color: '#555' }}>
                                <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: color, marginRight: '8px' }}></span>
                                {sub.title}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        section.isPage && (
                          <div className="nav-sub-items" style={{ paddingLeft: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', padding: '5px 0', color: '#555' }}>
                              <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: (selectedProject?.sections?.[section.id]?.status === 'approved' ? '#10b981' : '#f59e0b'), marginRight: '8px' }}></span>
                              {section.title}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Preview Canvas */}
              <div className="preview-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e5e7eb' }}>
                <div className="preview-toolbar" style={{ padding: '10px', background: 'white', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                  <button onClick={() => handlePreviewNav('prev')} disabled={currentPageIndex === 0}>Previous</button>
                  <span>Page {currentPageIndex + 1} / {totalPages}</span>
                  <button onClick={() => handlePreviewNav('next')} disabled={currentPageIndex === totalPages - 1}>Next</button>
                </div>

                <div className="preview-canvas" style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
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