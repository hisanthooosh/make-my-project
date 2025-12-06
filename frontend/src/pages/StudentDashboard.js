import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api';
import './StudentDashboard.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import MBU_Logo from '../assets/MBU_Logo.png';

// --- 1. NEW REPORT STRUCTURE ---
const reportStructure = [
  { id: 'titlePage', title: 'Title Page', isPage: true, subsections: [], inputType: 'form' },
  { id: 'certificate', title: 'Certificate (Text)', isPage: true, subsections: [], inputType: 'generated' },
  { id: 'certificateScan', title: 'Certificate (Scan)', isPage: true, subsections: [], inputType: 'image' },
  { id: 'acknowledgement', title: 'Acknowledgement', isPage: true, subsections: [] },
  { id: 'abstract', title: 'Abstract', isPage: true, subsections: [] },
  { id: 'orgInfo', title: 'Organization Information', isPage: true, subsections: [] },
  { id: 'methodologies', title: 'Methodologies', isPage: true, subsections: [] },
  { id: 'benefits', title: 'Benefits of the Company/Institution through our report', isPage: true, subsections: [] },
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

// --- Default Content Helpers ---
const getDefaultContent = (sectionId) => {
  switch (sectionId) {
    case 'acknowledgement':
      return `I express my deep sense of gratitude to our beloved chancellor Dr. M. Mohan Babu, Padma Shri awardee for his encouragement throughout the program.\n\nI express my deep sense of gratitude to our beloved vice-chancellor Dr. Nagaraj Ramrao, for his encouragement throughout the program.\n\nI owe my gratitude and special thanks to the Dean Dr. Babu DevasenaPati, for his special encouragement and advice to shape myself for the future career.\n\nI am extremely thankful to Dr. M. Sowmya Vani, HOD, and Department of Computer Applications for all provisions made and for his constant encouragement throughout my work.`;
    case 'weeklyOverview':
      // Default structure for weeks
      return [
        { week: '1st Week', date: '', day: '', topic: 'Introduction to Internship' }
      ];
    default:
      return '';
  }
};

const StudentDashboard = ({ user, onLogout }) => {
  const [project, setProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [paginatedContent, setPaginatedContent] = useState(['']);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pdfPreviewRef = useRef(null);

  // State for Title Page Data
  const [titlePageData, setTitlePageData] = useState({
    title: 'INTERNSHIP REPORT',
    subTitle: 'A report submitted in partial fulfillment of the requirements for the Award of Degree of',
    degree: 'MASTER OF COMPUTER APPLICATIONS',
    studentName: user.name || '',
    rollNo: user.rollNumber || '',
    companyName: 'IBM',
    duration: 'July 2025 to August 2025',
    academicYear: '2024 - 2025'
  });

  // State for Weekly Overview
  const [weeklyData, setWeeklyData] = useState([]);
  // --- CALCULATE PROGRESS STATS (NEW) ---
  const progressStats = useMemo(() => {
    const total = allSections.length;
    const drafts = [];
    const submitted = []; // 'pending' status
    const approved = [];

    allSections.forEach(section => {
      // Safely access status
      const status = project?.sections?.[section.id]?.status;

      if (status === 'draft') drafts.push(section.title);
      else if (status === 'pending') submitted.push(section.title);
      else if (status === 'approved') approved.push(section.title);
    });

    return {
      draft: { count: drafts.length, percent: Math.round((drafts.length / total) * 100), list: drafts },
      submitted: { count: submitted.length, percent: Math.round((submitted.length / total) * 100), list: submitted },
      approved: { count: approved.length, percent: Math.round((approved.length / total) * 100), list: approved }
    };
  }, [project]);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchFullProject = async () => {
      setLoading(true);
      try {
        const { data: projectData } = await api.get('/projects/my-project');
        setProject(projectData);

        // Load Title Page Data if exists
        if (projectData.sections?.titlePage?.content) {
          setTitlePageData(prev => ({ ...prev, ...projectData.sections.titlePage.content }));
        } else {
          // Set defaults if new
          setTitlePageData(prev => ({ ...prev, studentName: user.name, rollNo: user.rollNumber }));
        }

      } catch (err) {
        if (err.response && err.response.status === 404) {
          setProject({ sections: {} }); // Empty project
        } else {
          setError('Could not fetch project.');
        }
      }
      setLoading(false);
    };
    fetchFullProject();
  }, [user]);

  // --- Page Calculation (Memoized) ---
  const allPages = useMemo(() => {
    const pages = [];
    if (!project) return [];

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

      // 3. Single Pages (Title, Cert, Text, Weekly)
      const content = project.sections?.[section.id]?.content;

      // Special handling for TitlePage and Weekly
      // [REPLACE THE PREVIOUS weeklyOverview CHECK WITH THIS]
      if (section.id === 'weeklyOverview') {
        const ROWS_PER_PAGE = 12; // Max rows per page
        // Use local weeklyData state if available, otherwise project content
        const data = weeklyData.length > 0 ? weeklyData : (project.sections?.weeklyOverview?.content || []);
        const totalRows = data.length > 0 ? data.length : 1;
        const pageCount = Math.ceil(totalRows / ROWS_PER_PAGE);

        for (let i = 0; i < pageCount; i++) {
          pages.push({
            id: `weeklyOverview_${i}`,
            title: section.title,
            pageIndex: i,
            sectionId: section.id
          });
        }
      }
      else if (section.inputType === 'image') {
        const content = project.sections?.[section.id]?.content;

        // Calculate how many images/pages we have
        let count = 1;
        if (Array.isArray(content) && content.length > 0) count = content.length;
        else if (content && typeof content === 'string') count = 1;

        // Generate a page for each image
        for (let i = 0; i < count; i++) {
          pages.push({ id: `${section.id}_${i}`, title: section.title, pageIndex: i, sectionId: section.id });
        }
      }
      else {
        // Normal Text Paginated
        let contentPages = Array.isArray(content) ? (content.length ? content : ['']) : (content ? [content] : [getDefaultContent(section.id)]);
        contentPages.forEach((_, idx) => pages.push({ id: `${section.id}_${idx}`, title: section.title, pageIndex: idx, sectionId: section.id }));
      }
    });
    return pages;
  }, [project]);

  const totalPages = allPages.length;

  // --- Editor Opening Logic ---
  const openEditModal = (sectionId) => {
    const section = allSections.find(s => s.id === sectionId);
    if (!section || section.id === 'toc') return;

    setEditingSectionId(sectionId);
    setIsModalOpen(true);
    setError('');
    setSuccess('');

    const savedContent = project?.sections?.[sectionId]?.content;

    if (sectionId === 'titlePage') {
      if (savedContent) setTitlePageData(savedContent);
    }
    else if (sectionId === 'weeklyOverview') {
      setWeeklyData(Array.isArray(savedContent) ? savedContent : getDefaultContent('weeklyOverview'));
    }
    else if (section.inputType === 'image') {
      setPaginatedContent(savedContent ? [savedContent] : []);
    }
    else {
      if (Array.isArray(savedContent)) setPaginatedContent(savedContent);
      else if (savedContent) setPaginatedContent([savedContent]);
      else setPaginatedContent([getDefaultContent(sectionId)]);
    }
  };

  // --- Saving Logic ---
  const handleSaveSection = async (status) => {

    // 1. Get the current section details to check its type
    const currentSection = allSections.find(s => s.id === editingSectionId);

    // 2. NEW CHECK: Only check line limits for TEXT sections (Not images, not tables)
    if (
      editingSectionId !== 'titlePage' &&
      editingSectionId !== 'weeklyOverview' &&
      editingSectionId !== 'acknowledgement' &&
      currentSection?.inputType !== 'image' // <--- THIS FIXES THE CRASH
    ) {
      for (let i = 0; i < paginatedContent.length; i++) {
        const isFirstPage = i === 0;
        const hasSubheading = isFirstPage && ['orgInfo', 'methodologies', 'benefits', 'intro_main', 'intro_modules'].includes(editingSectionId);

        // Safety check: ensure we are checking a string
        const textToCheck = typeof paginatedContent[i] === 'string' ? paginatedContent[i] : '';
        const stats = calculateLineStats(textToCheck, hasSubheading);

        if (stats.isOver) {
          setError(`Error on Page ${i + 1}: Text is too long (${stats.lines}/${stats.max} lines). Please move text to a new page.`);
          return; // Stop saving
        }
      }
    }

    setSaveLoading(true);
    let contentToSave;

    if (editingSectionId === 'titlePage') contentToSave = titlePageData;
    else if (editingSectionId === 'weeklyOverview') contentToSave = weeklyData;
    else contentToSave = paginatedContent;

    try {
      await api.post('/projects/update-section', {
        section: editingSectionId,
        content: contentToSave,
        status: status
      });

      setProject(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [editingSectionId]: { ...prev.sections[editingSectionId], content: contentToSave, status }
        }
      }));
      setSuccess('Saved successfully!');
      setTimeout(() => { setIsModalOpen(false); setSuccess(''); }, 1000);
    } catch (err) {
      setError('Save failed: ' + err.message);
    }
    setSaveLoading(false);
  };

  // --- Image Upload (Updated for Multiple Screenshots) ---
  const handleImageUpload = async (file) => {
    if (!file) return;
    setSaveLoading(true);
    const formData = new FormData();
    formData.append('images', file);
    try {
      const { data } = await api.post('/projects/upload-images', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrl = data.images[0];

      if (editingSectionId === 'screenshots') {
        // APPEND: Add to the existing list of images
        setPaginatedContent(prev => [...prev, newUrl]);
      } else {
        // REPLACE: Standard behavior for Certificate/Diagrams (only 1 image)
        setPaginatedContent([newUrl]);
      }
      setSuccess('Image uploaded! Click Save to confirm.');
    } catch (err) {
      setError('Upload failed.');
    }
    setSaveLoading(false);
  };

  // --- Helper Functions for Weekly Editor ---
  const addWeekRow = () => {
    setWeeklyData([...weeklyData, { week: `${weeklyData.length + 1} Week`, date: '', day: '', topic: '' }]);
  };

  const updateWeekRow = (index, field, value) => {
    const newData = [...weeklyData];
    newData[index][field] = value;
    setWeeklyData(newData);
  };

  const removeWeekRow = (index) => {
    const newData = [...weeklyData];
    newData.splice(index, 1);
    setWeeklyData(newData);
  }

  // --- RENDER EDITOR CONTENT ---
  const renderEditorContent = () => {
    const section = allSections.find(s => s.id === editingSectionId);

    // 1. Title Page Editor
    if (editingSectionId === 'titlePage') {
      return (
        <div className="form-group-grid">
          <div>
            <label>Company Name</label>
            <input className="form-input" value={titlePageData.companyName} onChange={e => setTitlePageData({ ...titlePageData, companyName: e.target.value })} />
          </div>
          <div>
            <label>Academic Year</label>
            <input className="form-input" value={titlePageData.academicYear} onChange={e => setTitlePageData({ ...titlePageData, academicYear: e.target.value })} />
          </div>
          <div>
            <label>Student Name</label>
            <input className="form-input" value={titlePageData.studentName} onChange={e => setTitlePageData({ ...titlePageData, studentName: e.target.value })} />
          </div>
          <div>
            <label>Roll Number</label>
            <input className="form-input" value={titlePageData.rollNo} onChange={e => setTitlePageData({ ...titlePageData, rollNo: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Internship Duration</label>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: '#666' }}>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const date = new Date(e.target.value);
                    const startMonth = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    const currentEnd = titlePageData.duration.includes(' to ') ? titlePageData.duration.split(' to ')[1] : '';
                    setTitlePageData({ ...titlePageData, duration: `${startMonth} to ${currentEnd}` });
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: '#666' }}>End Date</label>
                <input
                  type="date"
                  className="form-input"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const date = new Date(e.target.value);
                    const endMonth = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    const currentStart = titlePageData.duration.includes(' to ') ? titlePageData.duration.split(' to ')[0] : '';
                    setTitlePageData({ ...titlePageData, duration: `${currentStart} to ${endMonth}` });
                  }}
                />
              </div>
            </div>
            <label style={{ fontSize: '0.8rem', color: '#666' }}>Formatted Text (Preview)</label>
            <input
              className="form-input"
              value={titlePageData.duration}
              onChange={e => setTitlePageData({ ...titlePageData, duration: e.target.value })}
              placeholder="e.g. July 2025 to August 2025"
            />
          </div>
        </div>
      );
    }

    // 2. Weekly Overview Editor
    // [REPLACE THE ENTIRE weeklyOverview EDITOR BLOCK]
    if (editingSectionId === 'weeklyOverview') {
      return (
        <div className="weekly-editor">
          {/* --- GENERATOR CONTROLS --- */}
          <div style={{ background: '#f0f0f0', padding: '15px', marginBottom: '20px', borderRadius: '8px' }}>
            <h4>Auto-Generate Schedule</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Start Date</label>
                <input type="date" id="gen-start" className="form-input" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Total Weeks</label>
                <input type="number" id="gen-weeks" className="form-input" defaultValue="4" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Working Days/Week</label>
                <input type="number" id="gen-days" className="form-input" defaultValue="5" />
              </div>
            </div>
            <button className="form-button" style={{ background: '#007bff' }} onClick={() => {
              const startVal = document.getElementById('gen-start').value;
              const weeksVal = parseInt(document.getElementById('gen-weeks').value) || 4;
              const daysVal = parseInt(document.getElementById('gen-days').value) || 5;

              if (!startVal) return alert('Please select a start date');

              let currentDate = new Date(startVal);
              const newRows = [];
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

              for (let w = 1; w <= weeksVal; w++) {
                let daysAdded = 0;
                while (daysAdded < daysVal) {
                  const dayIndex = currentDate.getDay();
                  // Skip Sunday (0). You can customize this if needed.
                  if (dayIndex !== 0) {
                    newRows.push({
                      week: `Week ${w}`,
                      date: currentDate.toISOString().split('T')[0], // Format YYYY-MM-DD
                      day: dayNames[dayIndex],
                      topic: '' // User fills this in
                    });
                    daysAdded++;
                  }
                  // Move to next day
                  currentDate.setDate(currentDate.getDate() + 1);
                }
                // Skip to next Monday if we finished a week mid-week (optional logic, keeps weeks clean)
                while (currentDate.getDay() !== 1) {
                  currentDate.setDate(currentDate.getDate() + 1);
                }
              }
              setWeeklyData(newRows);
            }}>
              Generate Table
            </button>
          </div>

          {/* --- EDITABLE TABLE --- */}
          <div className="weekly-table-container">
            {weeklyData.map((row, index) => (
              <div key={index} className="weekly-row-edit" style={{ display: 'flex', gap: '10px', marginBottom: '5px', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                <div style={{ width: '80px', fontSize: '12px', fontWeight: 'bold' }}>{row.week}</div>
                <div style={{ width: '90px', fontSize: '12px' }}>{row.date}</div>
                <div style={{ width: '80px', fontSize: '12px', color: '#555' }}>{row.day}</div>
                <input
                  placeholder="Enter Topic / Activity..."
                  value={row.topic}
                  onChange={e => updateWeekRow(index, 'topic', e.target.value)}
                  style={{ flex: 1, padding: '5px' }}
                />
              </div>
            ))}
            {weeklyData.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>Use the controls above to generate your schedule.</p>}
          </div>
        </div>
      );
    }

    // 3. Generated Certificate (Read Only)
    if (section.inputType === 'generated') {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>This page is auto-generated.</h3>
          <p>It uses the data you entered in the <strong>Title Page</strong> section.</p>
          <p>Check the "Live Preview" to see how it looks.</p>
        </div>
      );
    }

    // 4. Image Uploaders
    if (section.inputType === 'image') {

      // A. Special UI for Screenshots (Multiple Pages)
      if (editingSectionId === 'screenshots') {
        return (
          <div className="section-image-uploader">
            <p>Upload screenshots of your project. Each image will be added as a new page.</p>

            {/* List existing images with Delete buttons */}
            {paginatedContent.map((url, idx) => (
              <div key={idx} className="page-editor-group" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h4>Page {idx + 1}</h4>
                <img src={url} alt={`Screenshot ${idx + 1}`} className="editor-image-preview" style={{ display: 'block', marginBottom: '10px', maxHeight: '200px' }} />
                <button
                  className="delete-btn"
                  style={{ background: '#ff4444', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
                  onClick={() => {
                    const newP = [...paginatedContent];
                    newP.splice(idx, 1);
                    setPaginatedContent(newP);
                  }}
                >
                  Remove This Screenshot
                </button>
              </div>
            ))}

            {/* Add New Uploader */}
            <div style={{ marginTop: '20px', background: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
              <h4>+ Add Another Screenshot</h4>
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files[0])} />
            </div>
          </div>
        );
      }

      // B. Default Single Image (Certificate Scan, etc.)
      return (
        <div className="section-image-uploader">
          <p>{section.id === 'certificateScan' ? 'Upload a scan of your signed certificate.' : 'Upload your diagram.'}</p>
          <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files[0])} />
          {paginatedContent[0] && <img src={paginatedContent[0]} alt="Preview" className="editor-image-preview" />}
        </div>
      );
    }

    // --- PASTE YOUR NEW CODE HERE (BELOW) ---

    // 3.5. Acknowledgement (LOCKED / READ ONLY)
    if (editingSectionId === 'acknowledgement') {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>Acknowledgement is Auto-Generated</h3>
          <p>This section automatically uses your Name, Roll Number, and Company Name.</p>
          <p>You do not need to type anything here.</p>
          <div style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', border: '1px solid #ddd', textAlign: 'left', fontSize: '0.9rem' }}>
            <strong>Preview:</strong><br />
            I express my deep sense of gratitude to... (Standard Text)<br /><br />
            Student: {titlePageData.studentName}<br />
            Roll No: {titlePageData.rollNo}
          </div>
        </div>
      );
    }

    // 5. Standard Text Editor (WITH LINE LIMITS)
    return (
      <div className="paginated-editor">
        {paginatedContent.map((text, i) => {
          // Determine if this specific page has a subheading
          const isFirstPage = i === 0;
          const hasSubheading = isFirstPage && ['orgInfo', 'methodologies', 'benefits', 'intro_main', 'intro_modules'].includes(editingSectionId);

          const stats = calculateLineStats(text, hasSubheading);

          return (
            <div key={i} className="page-editor-group" style={{ border: stats.isOver ? '2px solid red' : '1px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <h4>Page {i + 1} {hasSubheading && <span style={{ fontSize: '0.8rem', color: '#666' }}>(Has Sub-heading)</span>}</h4>

                {/* LINE COUNTER DISPLAY */}
                <span style={{
                  fontWeight: 'bold',
                  color: stats.isOver ? 'red' : 'green',
                  fontSize: '0.9rem'
                }}>
                  {stats.isOver
                    ? `OVER LIMIT! Remove ${Math.abs(stats.remaining)} lines`
                    : `${stats.remaining} lines remaining`
                  }
                  ({stats.lines}/{stats.max})
                </span>
              </div>

              <textarea
                className="form-textarea"
                value={text}
                style={{ height: '400px' }}
                onChange={e => {
                  const newP = [...paginatedContent];
                  newP[i] = e.target.value;
                  setPaginatedContent(newP);
                }}
              />

              <div style={{ marginTop: '5px', fontSize: '12px', color: '#555' }}>
                {stats.isOver && <p style={{ color: 'red' }}>⚠ You have typed too much for this page. Please create a new page below and move the extra text there.</p>}
              </div>

              <button
                className="delete-btn"
                style={{ marginTop: '10px', background: '#ff4444', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
                onClick={() => {
                  const newP = [...paginatedContent]; newP.splice(i, 1); setPaginatedContent(newP);
                }}
                disabled={paginatedContent.length === 1}
              >
                Remove Page
              </button>
            </div>
          );
        })}

        <div style={{ marginTop: '20px', borderTop: '2px dashed #ccc', paddingTop: '10px' }}>
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>Need more space? Add another page. The Index/Table of Contents will update automatically.</p>
          <button className="form-button add-page-btn" onClick={() => setPaginatedContent([...paginatedContent, ''])}>+ Add New Page</button>
        </div>
      </div>
    );
  };

  // --- RENDER PREVIEW (A4 Pages) ---
  const renderPreview = () => {
    if (!project) return <p>Loading...</p>;

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

    return (
      <div className="preview-content-wrapper" ref={pdfPreviewRef}>
        <div className="preview-content-filmstrip" style={{ transform: `translateX(-${currentPageIndex * 100}%)` }}>

          {allPages.map((page, idx) => {
            const section = allSections.find(s => s.id === page.sectionId);
            const content = project.sections?.[page.sectionId]?.content;
            let pageContent = null;

            // --- 1. TITLE PAGE ---
            if (page.sectionId === 'titlePage') {
              const data = content || titlePageData;
              pageContent = (
                <div style={styles.borderFrame}>
                  <div>
                    <div style={styles.mainTitle}>{data.title || 'INTERNSHIP REPORT'}</div>
                    <div style={styles.subText}>{data.subTitle}</div>
                    <div style={styles.degreeText}>{data.degree}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '14pt', margin: '10px 0' }}>by</div>
                    <div style={styles.nameText}>{data.studentName}</div>
                    <div style={styles.rollNoText}>{data.rollNo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '14pt', margin: '10px 0' }}>in</div>
                    <div style={styles.companySection}>{data.companyName}</div>
                    <div style={{ fontSize: '12pt' }}>(Duration: {data.duration})</div>
                  </div>
                  <div style={styles.collegeSection}>
                    <img src={MBU_Logo} alt="MBU" style={{ width: '130px', height: 'auto' }} />
                    <div style={styles.deptName}>DEPARTMENT OF COMPUTER APPLICATIONS</div>
                    <div style={styles.collegeName}>MOHAN BABU UNIVERSITY</div>
                    <div style={styles.addressText}>Sree Sainath Nagar, A. Rangampet, Tirupati - 517102</div>
                    <div style={styles.yearText}>{data.academicYear}</div>
                  </div>
                </div>
              );
            }

            // --- 2. CERTIFICATE (TEXT) ---
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

            // --- 3. CERTIFICATE (SCAN) ---
            else if (page.sectionId === 'certificateScan') {
              const imgUrl = Array.isArray(content) ? content[page.pageIndex] : content;
              pageContent = (
                <div style={{ ...styles.borderFrame, justifyContent: 'center', padding: '20px' }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt="Certificate Scan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#999' }}>
                      <h3 style={{ fontSize: '18pt', fontWeight: 'bold', textDecoration: 'underline' }}>SIGNED CERTIFICATE SCAN</h3>
                      <p style={{ marginTop: '20px', fontStyle: 'italic' }}>No image uploaded.</p>
                    </div>
                  )}
                </div>
              );
            }

            // =========================================================
            // 4. ACKNOWLEDGEMENT (FIXED: Defined 'data' & Bottom-Right Corner)
            // =========================================================
            else if (page.sectionId === 'acknowledgement') {
              const data = titlePageData; // <--- FIX 1: This prevents the crash

              pageContent = (
                // We override some borderFrame defaults to ensure top-alignment for text and bottom-alignment for the name
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
                    marginTop: 'auto',        // Pushes this container to the very bottom
                    alignSelf: 'flex-end',    // Aligns the container to the right side
                    textAlign: 'right',       // Aligns the text inside to the right
                    fontSize: '13pt',
                    fontWeight: 'bold',
                    marginBottom: '20px'      // Space from the bottom border
                  }}>
                    <div style={{ textTransform: 'uppercase' }}>{data.studentName}</div>
                    <div>({data.rollNo})</div>
                  </div>
                </div>
              );
            }
            // [REPLACE THE WEEKLY OVERVIEW PREVIEW BLOCK]
            else if (page.sectionId === 'weeklyOverview') {
              const ROWS_PER_PAGE = 12; // Must match the number in Step 1
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
            // --- NEW: DYNAMIC INDEX (TOC) ---
            else if (page.sectionId === 'toc') {
              // 1. Define which sections strictly belong in the TOC (starting from Acknowledgement)
              const tocRows = [];
              let startCollecting = false;

              // Helper to finding the page number in your 'allPages' list
              const findPageNumber = (id) => {
                const foundIdx = allPages.findIndex(p => p.sectionId === id);
                // logic: page count starts after the first 3 pages (Title, Cert, Scan) -> idx 3 = Page 1
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
                    // Option A: List the Main Header (e.g., "1. Introduction") pointing to first subsection
                    const firstSubPage = findPageNumber(sect.subsections[0].id);
                    if (firstSubPage) {
                      tocRows.push({ title: sect.title, page: firstSubPage, isMain: true });
                    }
                    // Option B: List sub-items indented (optional, currently strictly listing main items based on your request)
                    // If you want sub-items, uncomment below:
                    /*
                    sect.subsections.forEach(sub => {
                      const subPage = findPageNumber(sub.id);
                      if(subPage) tocRows.push({ title: sub.title, page: subPage, isMain: false });
                    });
                    */
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

            // --- 6. ALL OTHER PAGES (UPDATED for Sub-headings) ---
            else {
              const text = Array.isArray(content) ? content[page.pageIndex] : (content || getDefaultContent(page.sectionId));
              const isImageSection = section.inputType === 'image';
              const imgUrl = Array.isArray(content) ? content[0] : content;

              // 1. Identify if this is one of your special sub-heading pages
              const isSubHeadingPage = ['orgInfo', 'methodologies', 'benefits'].includes(page.sectionId);

              // 2. Define the style based on that check
              const titleStyle = isSubHeadingPage ? {
                textAlign: 'left',       // Puts text in top-left corner
                fontSize: '14pt',        // Smaller font size
                fontWeight: 'bold',
                textDecoration: 'none',
                marginBottom: '20px',
                marginTop: '0px',
                width: '100%'
              } : {
                textAlign: 'center',     // Keeps other pages (like Abstract) centered
                fontSize: '18pt',
                fontWeight: 'bold',
                textDecoration: 'underline',
                marginBottom: '30px',
                marginTop: '10px',
                textTransform: 'uppercase'
              };

              pageContent = (
                <div style={{
                  ...styles.borderFrame,
                  justifyContent: 'flex-start',
                  alignItems: 'stretch',
                  padding: '40px'
                }}>
                  {/* Page Title with dynamic style */}
                  {page.pageIndex === 0 && (
                    <h3 style={titleStyle}>
                      {page.parentTitle ? `${page.parentTitle}` : page.title}
                    </h3>
                  )}

                  {/* Subsection Title */}
                  {page.parentTitle && page.pageIndex === 0 && (
                    <h4 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '15px' }}>{page.title}</h4>
                  )}

                  {/* Content */}
                  {isImageSection ? (
                    <div style={{ textAlign: 'center' }}>
                      {imgUrl ? <img src={imgUrl} alt="Diagram" style={{ maxWidth: '100%', maxHeight: '800px' }} /> : 'No image'}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13pt', lineHeight: '1.8', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                      {text}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={idx} className="flipper-page-slot">
                <div className="report-page-a4" style={styles.a4}>
                  {pageContent}
                  {/* Page Number: Centered at the bottom */}
                  {/* Page Number: Centered at the bottom */}
                  {idx > 2 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '30px',
                      left: '0',
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '12pt',
                      color: 'black',
                      fontWeight: 'normal'
                    }}>
                      {idx - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    const input = pdfPreviewRef.current;
    const pages = input.querySelectorAll('.report-page-a4');
    const pdf = new jsPDF('p', 'mm', 'a4');
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    }
    pdf.save(`${user.rollNumber}_Internship_Report.pdf`);
    setLoading(false);
  };

  const handlePreviewNav = (dir) => {
    if (dir === 'next' && currentPageIndex < totalPages - 1) setCurrentPageIndex(currentPageIndex + 1);
    if (dir === 'prev' && currentPageIndex > 0) setCurrentPageIndex(currentPageIndex - 1);
  };

  return (
    <div className="student-dashboard">
      <header className="student-header">
        <h1>Student Dashboard</h1>
        {/* --- NEW: PROGRESS TRACKER DROPDOWNS --- */}
        <div className="header-progress-bar">
          
          {/* 1. DRAFT DROPDOWN */}
          <div className="progress-dropdown draft">
            <div className="progress-label">Drafting: {progressStats.draft.percent}%</div>
            <div className="progress-menu">
              <div className="menu-header">Drafts ({progressStats.draft.count})</div>
              <ul>
                {progressStats.draft.list.length > 0 ? (
                  progressStats.draft.list.map((item, idx) => <li key={idx}>{item}</li>)
                ) : ( <li className="empty">No drafts yet</li> )}
              </ul>
            </div>
          </div>

          {/* 2. SUBMITTED DROPDOWN */}
          <div className="progress-dropdown submitted">
            <div className="progress-label">Submitting: {progressStats.submitted.percent}%</div>
            <div className="progress-menu">
              <div className="menu-header">Submitted ({progressStats.submitted.count})</div>
              <ul>
                {progressStats.submitted.list.length > 0 ? (
                  progressStats.submitted.list.map((item, idx) => <li key={idx}>{item}</li>)
                ) : ( <li className="empty">Nothing submitted</li> )}
              </ul>
            </div>
          </div>

          {/* 3. APPROVED DROPDOWN */}
          <div className="progress-dropdown approved">
            <div className="progress-label">Approval: {progressStats.approved.percent}%</div>
            <div className="progress-menu">
              <div className="menu-header">Approved ({progressStats.approved.count})</div>
              <ul>
                {progressStats.approved.list.length > 0 ? (
                  progressStats.approved.list.map((item, idx) => <li key={idx}>{item}</li>)
                ) : ( <li className="empty">No approvals yet</li> )}
              </ul>
            </div>
          </div>

        </div>
        <div className="header-user-info"><span>{user.name}</span><button onClick={onLogout} className="logout-button">Logout</button></div>
      </header>
      <main className="student-main">
        <div className="dashboard-container">
          <div className="column-card section-nav-wrapper">
            <ul className="nav-list">
              {reportStructure.map(s => (
                <li key={s.id} className="nav-item-main">
                  <span onClick={() => !s.subsections.length && openEditModal(s.id)}>{s.title}</span>
                  {s.subsections.length > 0 && <ul>{s.subsections.map(sub => <li key={sub.id} onClick={() => openEditModal(sub.id)}>{sub.title}</li>)}</ul>}
                </li>
              ))}
            </ul>
          </div>
          <div className="column-card preview-card">
            <div className="preview-header">
              <h2>Live Preview</h2>
              <div>
                <button onClick={() => handlePreviewNav('prev')}>&larr;</button>
                <span style={{ margin: '0 10px' }}>Page {currentPageIndex + 1} / {totalPages}</span>
                <button onClick={() => handlePreviewNav('next')}>&rarr;</button>
              </div>
              <button onClick={handleDownloadPDF} disabled={loading}>{loading ? 'Generating...' : 'Download PDF'}</button>
            </div>
            {renderPreview()}
          </div>
        </div>
      </main>
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Editing: {allSections.find(s => s.id === editingSectionId)?.title}</h3><button onClick={() => setIsModalOpen(false)}>X</button></div>
            <div className="modal-body">{renderEditorContent()}</div>
            <div className="modal-footer">
              <button onClick={() => handleSaveSection('draft')} disabled={saveLoading}>Save Draft</button>
              <button onClick={() => handleSaveSection('pending')} disabled={saveLoading}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- HELPER: Calculate Line Usage ---
const calculateLineStats = (text, hasSubheading) => {
  if (!text) return { lines: 0, chars: 0 };

  // Approx limits for A4 (Times New Roman, 12-14pt)
  const CHARS_PER_LINE = 85;
  // If it has a subheading, we have less space (e.g., 30 lines), else ~35 lines
  const MAX_LINES = hasSubheading ? 30 : 36;

  const rawLines = text.split('\n');
  let totalVisualLines = 0;

  rawLines.forEach(line => {
    // If a line is longer than 85 chars, it wraps in the PDF, counting as multiple lines
    const wrapped = Math.ceil((line.length || 1) / CHARS_PER_LINE);
    totalVisualLines += wrapped;
  });

  return {
    lines: totalVisualLines,
    max: MAX_LINES,
    isOver: totalVisualLines > MAX_LINES,
    remaining: MAX_LINES - totalVisualLines
  };
};

export default StudentDashboard;