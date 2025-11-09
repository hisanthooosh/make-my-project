import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import './FacultyDashboard.css'; // We will create this file next
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

// Flattened list to find section definitions
const allSections = reportStructure.flatMap(s =>
  s.subsections.length > 0 ? s.subsections : s
);

// Helper to get default content (for students who haven't saved)
const getDefaultContent = (sectionId, student, project) => {
  const certData = project?.sections?.certificate?.content || {};
  switch (sectionId) {
    case 'declaration':
      return `I, ${student?.name || '[Student Name]'} hereby declare that, the project entitled "${certData.projectName || '[Project Title]'}"...`;
    case 'references':
      return `[Default References Text]`;
    case 'bioData':
      // Return a default *object* for the resume
      return {
        name: student?.name || 'Student Name',
        phone: 'Student Phone',
        email: student?.email || 'Student Email',
        summary: 'Student has not filled out this section.',
        techSkills: '',
        softSkills: '',
        experience: '',
        projects: '',
        education: '',
      };
    default:
      return `[Content not submitted yet]`;
  }
};


function FacultyDashboard({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- NEW: Search State ---
  const [searchTerm, setSearchTerm] = useState('');

  // --- Review Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewSectionId, setReviewSectionId] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState('approved'); // 'approved' or 'rejected'

  // --- Preview Flipper State ---
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const pdfPreviewRef = useRef(null);

  // --- PASTE THESE 3 FUNCTIONS INSIDE YOUR FacultyDashboard COMPONENT ---

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

  // This list defines all editable sections for the preview
  const allSections = reportStructure.flatMap(s =>
    s.subsections.length > 0 ? s.subsections : s
  );

  // --- REPLACE your old 'allPages' useMemo with THIS ---

  const allPages = useMemo(() => {
    const pages = [];
    // --- FIX: We check for project AND selectedStudent ---
    if (!project || !selectedStudent) return [];

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
          // --- FIX: Use selectedStudent ---
          contentPages = [content || getDefaultContent(section.id, selectedStudent, project)];
        } else if (Array.isArray(content)) {
          contentPages = content.length > 0 ? content : [''];
        } else if (content) {
          contentPages = [content];
        } else {
          // --- FIX: Use selectedStudent ---
          contentPages = [getDefaultContent(section.id, selectedStudent, project)];
        }

        if (contentPages.length === 0) contentPages.push(getDefaultContent(section.id, selectedStudent, project));

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

          // --- FIX: Use selectedStudent ---
          const contentPages = Array.isArray(content)
            ? (content.length > 0 ? content : [''])
            : (content ? [content] : [getDefaultContent(subSection.id, selectedStudent, project)]);

          if (contentPages.length === 0) contentPages.push(getDefaultContent(subSection.id, selectedStudent, project));

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
  }, [project, selectedStudent]); // --- FIX: Depends on project and selectedStudent ---

  const totalPages = allPages.length;
  // 1. Fetch the list of students on component load
  // --- MODIFIED: Assumes API now returns progress data ---
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // This API call is assumed to be updated to return:
        // { uid, name, rollNumber, progress, overallStatus }
        const { data } = await api.get('/faculty/my-students');
        setStudents(data);
        setError('');
      } catch (err) {
        setError('Could not fetch students.');
        console.error(err);
      }
      setLoading(false);
    };
    fetchStudents();
  }, []);

  // 2. Fetch project when a student is selected
  const handleSelectStudent = async (student) => {
    // If student is already selected, do nothing
    if (selectedStudent?.uid === student.uid) return;

    setSelectedStudent(student);
    setLoading(true);
    setProject(null); // Clear previous project
    try {
      const { data } = await api.get(`/faculty/student-project/${student.uid}`);
      setProject(data);
      setCurrentPageIndex(0); // Reset to first page
      setError('');
    } catch (err) {
      setProject(null); // Clear project on error
      setError(`Could not fetch project for ${student.name}.`);
      console.error(err);
    }
    setLoading(false);
  };

  // 3. Open the review modal
  const openReviewModal = (sectionId) => {
    const section = project.sections?.[sectionId];
    setReviewSectionId(sectionId);
    setReviewComment(section?.comment || ''); // Load existing comment
    setReviewStatus(section?.status === 'rejected' ? 'rejected' : 'approved'); // Default to approved
    setIsModalOpen(true);
  };

  // 4. Submit the review
  // --- MODIFIED: To also update the main student list on review ---
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

      // Update project state locally
      const updatedSections = {
        ...project.sections,
        [reviewSectionId]: {
          ...project.sections?.[reviewSectionId],
          status: reviewStatus,
          comment: reviewComment
        }
      };

      setProject(prev => ({ ...prev, sections: updatedSections }));

      // --- NEW: Update the main students list with new progress/status ---
      // The API response `reviewData` should contain { newProgress, newStatus }
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.uid === selectedStudent.uid
            ? { ...student, progress: reviewData.newProgress, overallStatus: reviewData.newStatus }
            : student
        )
      );
      // --- END NEW ---

      setIsModalOpen(false); // Close modal
      setReviewComment(''); // Reset form
      setError('');
    } catch (err) {
      setError('Failed to submit review.');
      console.error(err);
    }
    setLoading(false);
  };

  // --- Preview Navigation ---
  const handlePreviewNav = (direction) => {
    let newIndex = currentPageIndex;
    if (direction === 'next' && currentPageIndex < totalPages - 1) {
      newIndex++;
    }
    if (direction === 'prev' && currentPageIndex > 0) {
      newIndex--;
    }
    setCurrentPageIndex(newIndex);
  };

  // --- Helper to get status of a section ---
  const getSectionStatus = (sectionId) => {
    return project?.sections?.[sectionId]?.status || 'pending'; // Default to pending
  };

  // --- NEW: Filtered students list for search ---
  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (student.rollNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  //
  // --- REPLACE your old renderPreview function with THIS ---
  //
  const renderPreview = () => {
    // --- FIX: Check for selectedStudent ---
    if (!project || !selectedStudent || allPages.length === 0) {
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
    const certData = project.sections?.certificate?.content || {};
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
                      {/* --- FIX: Use mbuLogo (as imported in FacultyDashboard) --- */}
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
              const bioDataContent = project?.sections?.bioData?.content || getDefaultContent('bioData', selectedStudent, project);
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
              const content = project?.sections?.[sectionId]?.content;
              const defaultText = getDefaultContent(sectionId, selectedStudent, project);
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
    <div className="faculty-dashboard">
      <header className="faculty-header">
        <h1>Faculty Dashboard</h1>
        <div className="header-user-info">
          <span>Welcome, {user.name}</span>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </header>

      <main className="faculty-main">
        <div className="dashboard-container">

          {/* --- Column 1: Student List (MODIFIED) --- */}
          <div className="column-card student-list-wrapper">
            <h2 className="column-title">My Students</h2>

            {/* --- NEW: Search Bar --- */}
            <div className="search-bar-container">
              <input
                type="text"
                placeholder="Search by name or roll no..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loading && students.length === 0 && <p>Loading students...</p>}
            {error && students.length === 0 && <p className="form-error">{error}</p>}

            <div className="student-list">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <div
                    key={student.uid}
                    className={`student-item ${selectedStudent?.uid === student.uid ? 'active' : ''}`}
                    onClick={() => handleSelectStudent(student)}
                  >
                    <div style={{ marginBottom: "10px" }}>
                      <span style={{
                        display: "block",
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        {student.name}
                      </span>
                      <span style={{
                        display: "block",
                        fontSize: "0.95rem",
                        color: "#777"
                      }}>
                        {student.rollNumber}
                      </span>
                    </div>


                  </div>
                ))
              ) : (
                !loading && <p>{students.length > 0 ? 'No students match your search.' : 'No students assigned to you.'}</p>
              )}
            </div>
          </div>

          {/* --- Column 2: Project Review Area (MODIFIED) --- */}
          <div className="column-card project-review-wrapper">
            {!selectedStudent && (
              // --- NEW: Better Default UI ---
              <div className="placeholder-wrapper">
                <div className="placeholder-content">
                  <svg className="placeholder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 14H13V10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10V14H9C8.44772 14 8 14.4477 8 15C8 15.5523 8.44772 16 9 16H15C15.5523 16 16 15.5523 16 15C16 14.4477 15.5523 14 15 14Z"></path><path d="M7 3C4.23858 3 2 5.23858 2 8V16C2 18.7614 4.23858 21 7 21H17C19.7614 21 22 18.7614 22 16V8C22 5.23858 19.7614 3 17 3H7ZM20 8V16C20 17.6569 18.6569 19 17 19H7C5.34315 19 4 17.6569 4 16V8C4 6.34315 5.34315 5 7 5H17C18.6569 5 20 6.34315 20 8Z"></path></svg>
                  <h2>Ready to Review?</h2>
                  <p>Please select a student from the list on the left to load their project and begin your review.</p>
                </div>
              </div>
            )}
            {loading && selectedStudent && (
              <div className="placeholder-wrapper"><div className="placeholder-content">Loading project for {selectedStudent.name}...</div></div>
            )}
            {error && selectedStudent && (
              <div className="placeholder-wrapper"><div className="placeholder-content form-error">{error}</div></div>
            )}

            {project && (
              <div className="review-container">
                {/* --- Sub-Column 1: Section List --- */}
                <div className="section-list-nav">
                  <h3 className="column-title">Project Sections</h3>
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
                                  <li
                                    key={sub.id}
                                    className={`nav-item-sub status-${status}`}
                                    onClick={() => openReviewModal(sub.id)}
                                  >
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
                              <li
                                className={`nav-item-sub status-${getSectionStatus(section.id)}`}
                                onClick={() => openReviewModal(section.id)}
                              >
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
                        disabled={currentPageIndex === 0}
                      >
                        &larr;
                      </button>
                      <span>
                        Page {currentPageIndex + 1} of {totalPages}
                      </span>
                      <button
                        className="preview-nav-button"
                        onClick={() => handlePreviewNav('next')}
                        disabled={currentPageIndex === totalPages - 1}
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                  {renderPreview()}
                </div>

              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- Review Modal --- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitReview}>
              <div className="modal-header">
                <h3 className="editor-title">
                  Review Section: {allSections.find(s => s.id === reviewSectionId)?.title}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="modal-close-button">&times;</button>
              </div>

              <div className="modal-body">
                {error && <p className="form-error">{error}</p>}

                <div className="form-group-radio">
                  <label>
                    <input
                      type="radio"
                      name="status"
                      value="approved"
                      checked={reviewStatus === 'approved'}
                      onChange={(e) => setReviewStatus(e.target.value)}
                    />
                    Approve
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="status"
                      value="rejected"
                      checked={reviewStatus === 'rejected'}
                      onChange={(e) => setReviewStatus(e.target.value)}
                    />
                    Reject
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="comment">Comment</label>
                  <textarea
                    id="comment"
                    className="form-textarea"
                    rows="5"
                    placeholder="Provide feedback for the student..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <div className="form-button-group">
                  <button type="button" className="form-button save-draft" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="form-button submit-review" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultyDashboard;

