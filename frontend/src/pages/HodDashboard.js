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

  const closeProjectPreview = () => {
    setIsPreviewOpen(false);
    setSelectedStudent(null);
    setSelectedProject(null);
    setError('');
  };

  // --- REPLACE your old 'allPages' useMemo (around line 273) with THIS ---

  const allPages = useMemo(() => {
    const pages = [];
    // We must wait for the project and student to load
    if (!selectedProject || !selectedStudent) return [];
    // Use selectedProject as the 'project'
    const project = selectedProject;

    reportStructure.forEach(section => {

      // 1. Handle Table of Contents
      if (section.id === 'toc') {
        pages.push({
          id: 'toc_0',
          title: section.title,
          pageIndex: 0,
          sectionId: section.id, // 'toc'
          parentTitle: null
        });
        pages.push({
          id: 'toc_1',
          title: section.title,
          pageIndex: 1,
          sectionId: 'toc-2', // 'toc-2'
          parentTitle: null
        });
        return; // Done with this section
      }

      // 2. Handle sections that are single pages (no subsections)
      if (section.isPage && section.subsections.length === 0) {
        const content = project.sections?.[section.id]?.content;
        let contentPages = [];

        if (section.id === 'bioData') {
          contentPages = [content || getDefaultContent(section.id)]; // HOD getDefaultContent is simple
        } else if (Array.isArray(content)) {
          contentPages = content.length > 0 ? content : [''];
        } else if (content) {
          contentPages = [content];
        } else {
          contentPages = [getDefaultContent(section.id)];
        }

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

      // 3. Handle sections that are containers for subsections
      else if (!section.isPage && section.subsections.length > 0) {
        section.subsections.forEach(subSection => {
          const content = project.sections?.[subSection.id]?.content;

          const contentPages = Array.isArray(content)
            ? (content.length > 0 ? content : [''])
            : (content ? [content] : [getDefaultContent(subSection.id)]);

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
  }, [selectedProject, selectedStudent]); // Depends on these two states
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

  //
  // --- REPLACE your old renderPreview function with THIS ---
  //
  //
  // --- REPLACE your old renderPreview function(s) with THIS ---
  //
  const renderPreview = () => {
    // --- FIX: Check for selectedStudent and selectedProject ---
    if (loadingProject) return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Loading Project...</div>;
    if (!selectedProject) return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>This student has not started their project.</div>;
    if (!selectedStudent || allPages.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          <p>Loading project preview...</p>
        </div>
      );
    }

    // --- Reusable Inline Styles (Copied from Student) ---
    const styles = {
      a4Page: {
        width: '794px',
        minHeight: '1123px',
        padding: '50px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '12pt',
        lineHeight: 1.5,
        color: '#000',
        position: 'relative',
        overflow: 'hidden',
      },
      contentBorder: {
        minHeight: '1000px',
        border: '3px double #000',
        padding: '40px',
        position: 'relative',
      },
      pageHeaderContainer: {
        position: 'absolute',
        top: '25px',
        left: '50px',
        right: '50px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10pt',
        color: '#000',
        fontFamily: 'Arial, sans-serif',
      },
      pageFooter: {
        position: 'absolute',
        bottom: '25px',
        left: '50px',
        right: '50px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10pt',
        color: '#333',
        fontFamily: 'Arial, sans-serif',
      },
      mainHeading: {
        fontSize: '16pt',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        textAlign: 'center',
        marginBottom: '24px',
        paddingTop: '10px',
      },
      subHeading: {
        fontSize: '14pt',
        fontWeight: 'bold',
        marginBottom: '16px',
      },
      bodyText: {
        textAlign: 'justify',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        fontSize: '12pt',
      },
      tocList: {
        listStyleType: 'none',
        paddingLeft: 0,
      },
      tocItem: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        fontSize: '12pt',
      },
      tocSubList: {
        listStyleType: 'none',
        paddingLeft: '30px',
      },
      tocSubItem: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
        fontSize: '11pt',
      },
      resumePage: {
        padding: '0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11pt',
      },
      resumeHeader: {
        textAlign: 'center',
        marginBottom: '20px',
      },
      resumeContact: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        fontSize: '10pt',
        color: '#333',
      },
      resumeSection: {
        marginBottom: '15px',
      },
      resumeSectionH3: {
        fontSize: '13pt',
        fontWeight: 'bold',
        borderBottom: '2px solid #000',
        paddingBottom: '5px',
        marginBottom: '8px',
        color: '#000',
      },
    };

    // --- Helper to get page number for TOC ---
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

    // --- Get Certificate Data (for headers) ---
    // --- FIX: Use selectedProject ---
    const certData = selectedProject.sections?.certificate?.content || {};
    const shortTitle = certData.shortTitle || certData.projectName || 'Project Title';
    // --- FIX: Use selectedStudent ---
    const studentRollNo = selectedStudent.rollNumber || selectedStudent.email?.split('@')[0] || '[RollNo]';

    // --- Split reportStructure for TOC pages ---
    const tocItems = reportStructure.filter(s => s.id !== 'toc' && s.id !== 'images');
    const splitIndex = 7;
    const tocPage1Items = tocItems.slice(0, splitIndex);
    const tocPage2Items = tocItems.slice(splitIndex);

    // --- Main Render Logic ---
    return (
      <div className="preview-content-wrapper" ref={pdfPreviewRef}>
        <div className="preview-content-filmstrip" style={{
          transform: `translateX(-${currentPageIndex * 100}%)`
        }}>

          {allPages.map((page, index) => {
            const { title, pageIndex: subPageIndex, sectionId, parentTitle } = page;
            const currentPageNum = index + 1;
            const sectionDef = allSections.find(s => s.id === sectionId);

            // ---
            // --- 1. CERTIFICATE PAGE (Unchanged) ---
            // ---
            if (sectionId === 'certificate') {
              return (
                <div className="flipper-page-slot" key="slot-certificate">
                  <div id="page-certificate" style={{
                    width: "794px",
                    minHeight: "1123px",
                    padding: "50px 60px",
                    fontFamily: "'Times New Roman', serif",
                    color: "#000",
                    backgroundColor: "#fff",
                    boxSizing: "border-box",
                    textAlign: "center",
                    position: "relative",
                    border: "1px solid #888",
                    fontSize: '12pt',
                  }}>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "10px" }}>
                      {/* --- FIX: Use mbuLogo (as imported in HODDashboard) --- */}
                      <img src={mbuLogo} alt="MBU Logo" style={{ width: "110px", height: "auto", marginRight: "15px" }} />
                      <div style={{ textAlign: "center" }}>
                        <h1 style={{ color: "#D10000", fontSize: "30px", fontWeight: "bold", margin: "0", lineHeight: "1.2", letterSpacing: "0.5px" }}>
                          MOHAN BABU UNIVERSITY
                        </h1>
                        <p style={{ fontSize: "14px", margin: "5px 0 0 0" }}>
                          Sree Sainath Nagar, Tirupati 517 102
                        </p>
                      </div>
                    </div>
                    <h3 style={{ fontSize: "18px", margin: "15px 0 5px 0" }}>
                      SCHOOL OF COMPUTING
                    </h3>
                    <h3 style={{ fontSize: "16px", margin: "5px 0 25px 0" }}>
                      DEPARTMENT OF COMPUTER APPLICATIONS
                    </h3>
                    <h2 style={{ fontSize: "28px", textDecoration: "underline", color: "#000066", marginBottom: "30px", fontFamily: "'Old English Text MT', 'Times New Roman', serif" }}>
                      Certificate
                    </h2>
                    <div style={{ textAlign: "justify", fontSize: "16px", lineHeight: "1.8", width: "90%", margin: "0 auto" }}>
                      <p>
                        This is to certify that the project report entitled{" "}
                        <span style={{ color: "#C00000", fontWeight: "bold" }}>
                          {certData.projectName || "[Project Title]"}
                        </span>{" "}
                        is the <span style={{ fontWeight: "bold" }}>bonafide</span> work
                        carried out and submitted by
                      </p>
                      <p style={{ textAlign: "center", marginTop: "25px" }}>
                        <span style={{ color: "#0000FF", fontWeight: "bold", fontSize: "18px", textTransform: "uppercase" }}>
                          {/* --- FIX: Use selectedStudent --- */}
                          {selectedStudent.name || "[Student Name]"}
                        </span>
                        <br />
                        <span style={{ fontWeight: "bold" }}>
                          {studentRollNo}
                        </span>
                      </p>
                      <p style={{ marginTop: "20px" }}>
                        in the Department of <strong>Computer Applications</strong>, <strong>School of Computing</strong> of <strong>Mohan Babu University, <u>Tirupati</u></strong> in partial fulfillment of the requirements for the award of the degree of <strong>{certData.degreeAwarded || "Master of Computer Applications"}</strong> during <strong>{certData.batch || "2025-26"}</strong>.
                      </p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "60px", padding: "0 60px", textAlign: "left", fontSize: '12pt' }}>
                      <div style={{ width: "45%" }}>
                        <strong>Guide</strong>
                        <br /><br />
                        <p>
                          {certData.guideName || "[Guide Name]"}<br />
                          {certData.guideDesignation || "[Guide Designation]"}
                        </p>
                      </div>
                      <div style={{ width: "45%", textAlign: "right" }}>
                        <strong>Head of Dept.</strong>
                        <br /><br />
                        <p>
                          {certData.hodName || "[HOD Name]"}<br />
                          {certData.hodDesignation || "[HOD Designation]"}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "left", marginTop: "50px", paddingLeft: "60px", fontWeight: "bold", fontSize: '12pt' }}>
                      Date: {new Date(certData.submissionDate || Date.now()).toLocaleDateString("en-GB")}
                    </div>
                    <div className="report-page-footer" style={{
                      position: 'absolute',
                      bottom: '50px',
                      left: '60px',
                      right: '60px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10pt',
                      fontFamily: 'Arial, sans-serif',
                    }}>
                      <span>MBU 2026</span>
                      <span>{currentPageNum}</span>
                    </div>
                  </div>
                </div>
              );
            }

            // ---
            // --- ALL OTHER PAGES (TOC, BioData, Content) ---
            // ---
            let pageContent;

            // --- 2. TABLE OF CONTENTS (PAGE 1) ---
            if (sectionId === 'toc') {
              pageContent = (
                <>
                  <h3 style={styles.mainHeading}>TABLE OF CONTENTS</h3>
                  <ul style={styles.tocList}>
                    {tocPage1Items.map((sec) => (
                      <React.Fragment key={sec.id}>
                        <li style={styles.tocItem}>
                          <span>{sec.title}</span>
                          <span>{getPageNumForSection(sec.id)}</span>
                        </li>
                        {sec.subsections.length > 0 && (
                          <ul style={styles.tocSubList}>
                            {sec.subsections.map((sub) => (
                              <li key={sub.id} style={styles.tocSubItem}>
                                <span>{sub.title}</span>
                                <span>{getPageNumForSection(sub.id)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </React.Fragment>
                    ))}
                  </ul>
                </>
              );
            }

            // --- NEW: TABLE OF CONTENTS (PAGE 2) ---
            else if (sectionId === 'toc-2') {
              pageContent = (
                <>
                  <div style={{ height: '30px' }}></div>
                  <ul style={styles.tocList}>
                    {tocPage2Items.map((sec) => (
                      <React.Fragment key={sec.id}>
                        <li style={styles.tocItem}>
                          <span>{sec.title}</span>
                          <span>{getPageNumForSection(sec.id)}</span>
                        </li>
                        {sec.subsections.length > 0 && (
                          <ul style={styles.tocSubList}>
                            {sec.subsections.map((sub) => (
                              <li key={sub.id} style={styles.tocSubItem}>
                                <span>{sub.title}</span>
                                <span>{getPageNumForSection(sub.id)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </React.Fragment>
                    ))}
                  </ul>
                </>
              );
            }

            // --- 3. STUDENT BIO-DATA (RESUME) PAGE ---
            else if (sectionId === 'bioData') {
              // --- FIX: Use selectedStudent ---
              const bioDataContent = selectedProject?.sections?.bioData?.content || getDefaultContent('bioData');
              pageContent = (
                <div style={styles.resumePage}>
                  <div style={styles.resumeHeader}>
                    <h1 style={{ fontSize: '24pt', margin: '0 0 5px 0' }}>{bioDataContent.name || 'STUDENT NAME'}</h1>
                    <div style={styles.resumeContact}>
                      <span>{bioDataContent.phone || 'Phone'}</span>
                      <span>{bioDataContent.email || 'Email'}</span>
                      {bioDataContent.github && <span>GitHub</span>}
                      {bioDataContent.linkedin && <span>LinkedIn</span>}
                    </div>
                  </div>
                  <div style={styles.resumeSection}>
                    <h3 style={styles.resumeSectionH3}>PROFESSIONAL SUMMARY</h3>
                    <p style={{ ...styles.bodyText, textAlign: 'left' }}>{bioDataContent.summary || 'Not provided.'}</p>
                  </div>
                  <div style={styles.resumeSection}>
                    <h3 style={styles.resumeSectionH3}>CORE TECHNICAL SKILLS</h3>
                    {renderSkills(bioDataContent.techSkills)}
                  </div>
                  <div style={styles.resumeSection}>
                    <h3 style={styles.resumeSectionH3}>SOFT SKILLS</h3>
                    {renderSkills(bioDataContent.softSkills)}
                  </div>
                  <div style={styles.resumeSection}>
                    <h3 style={styles.resumeSectionH3}>EXPERIENCE AND INTERNSHIP</h3>
                    <p style={{ ...styles.bodyText, textAlign: 'left' }}>{renderWithBreaks(bioDataContent.experience)}</p>
                  </div>
                  <div style={styles.resumeSection}>
                    <h3 style={styles.resumeSectionH3}>PROJECTS</h3>
                    <p style={{ ...styles.bodyText, textAlign: 'left' }}>{renderWithBreaks(bioDataContent.projects)}</p>
                  </div>
                  <div style={styles.resumeSection}>
                    <h3 style={styles.resumeSectionH3}>EDUCATION</h3>
                    <p style={{ ...styles.bodyText, textAlign: 'left' }}>{renderWithBreaks(bioDataContent.education)}</p>
                  </div>
                </div>
              );
            }

            // --- 4. ALL OTHER STANDARD PAGES (Intro, Abstract, etc.) ---
            else {
              // --- FIX: Use selectedStudent ---
              const content = selectedProject?.sections?.[sectionId]?.content;
              const defaultText = getDefaultContent(sectionId);
              let contentPages = [];
              if (Array.isArray(content)) contentPages = content.length > 0 ? content : [defaultText];
              else if (content) contentPages = [content];
              else contentPages = [defaultText];
              const pageText = contentPages[subPageIndex] || '';

              const parentSection = parentTitle ? reportStructure.find(s => s.title === parentTitle) : null;
              const isFirstSubsection = parentSection && parentSection.subsections[0].id === sectionId;

              pageContent = (
                <>
                  {parentTitle && isFirstSubsection && subPageIndex === 0 && (
                    <h3 style={styles.mainHeading}>
                      {parentTitle.toUpperCase()}
                    </h3>
                  )}
                  {!parentTitle && subPageIndex === 0 && (
                    <h3 style={styles.mainHeading}>
                      {title.toUpperCase()}
                    </h3>
                  )}
                  {parentTitle && subPageIndex === 0 && (
                    <h4 style={styles.subHeading}>
                      {title}
                    </h4>
                  )}

                  {subPageIndex > 0 && (
                    <div style={{ height: '20px' }}></div>
                  )}
                  {sectionDef && sectionDef.inputType === 'image' ? (
                    <div style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
                      {pageText ? (
                        <img src={pageText} alt={title} style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc' }} />
                      ) : (
                        <p style={{ ...styles.bodyText, textAlign: 'center', fontStyle: 'italic' }}>No image submitted.</p>
                      )}
                    </div>
                  ) : (
                    <p style={styles.bodyText}>
                      {pageText}
                    </p>
                  )}
                </>
              );
            }

            // ---
            // --- RENDER THE STANDARD BORDERED PAGE (Unchanged) ---
            // ---
            return (
              <div className="flipper-page-slot" key={`slot-${page.id}`}>
                <div style={styles.a4Page}>

                  <div style={styles.pageHeaderContainer}>
                    <span>{studentRollNo}</span>
                    <span>{shortTitle}</span>
                  </div>

                  <div style={styles.contentBorder}>
                    {/* Page content (from logic above) goes here */}
                    {pageContent}
                  </div>

                  <div style={styles.pageFooter}>
                    <span>MBU 2026</span>
                    <span>{currentPageNum}</span>
                  </div>

                </div>
              </div>
            );

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
              {error && <p className="form-error" style={{ margin: '20px' }}>{error}</p>}
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