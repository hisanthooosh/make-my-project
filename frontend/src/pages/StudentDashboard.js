import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api';
import './StudentDashboard.css'; // This CSS file will be updated
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import MBU_Logo from '../assets/MBU_Logo.png';

// --- Hierarchical Report Structure (MODIFIED) ---
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
      // --- THIS IS THE CHANGE ---
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
  { id: 'bioData', title: 'Student Bio-data (Resume)', isPage: true, subsections: [] },

];
// This list now includes *all* items that can be edited
const allSections = reportStructure.flatMap(s =>
  s.subsections.length > 0 ? s.subsections : s
);

// --- Default Content (No Change) ---
const getDefaultContent = (sectionId, user, project) => {
  const certData = project?.sections?.certificate?.content || {};
  switch (sectionId) {
    case 'declaration':
      return `I, ${user.name || '[Your Name]'} hereby declare that, the project entitled "${certData.projectName || '[Project Title]'}" developed by me at MOHAN BABU UNIVERSITY, Tirupati during the Academic year 2024-2025 and submitted to The Mentor, MOHAN BABU UNIVERSITY for partial fulfilment for the award of Master of Computer Applications (MCA).\n\nI also declare that, the project is resulted by my own effort and that it has not been copied from anyone and not been submitted by anybody in any of the University or Institution or Research Centre.\n\nPlace: Tirupathi\nDate: ${new Date(certData.submissionDate || Date.now()).toLocaleDateString('en-GB')}`;
    case 'references':
      return `1. [Book/Paper Name], [Author], [Year]\n2. [Website URL]`;
    case 'bioData':
      // Return a default *object* for the resume
      return {
        name: user.name || 'SANTHOSH GANGASANI',
        location: 'Chittoor',
        phone: user.phone || '19182845569',
        email: user.email || 'iamsanthoosh30@gmail.com',
        github: 'https://github.com/hisanthooosh',
        linkedin: '',
        summary: 'Enthusiastic Machine Learning Developer skilled in Python...',
        technicalSkills: 'Python, TensorFlow, PyTorch, Scikit-learn, Pandas, NumPy',
        softSkills: 'Collaboration, Communication, Documentation',
        experience: 'React js - 3 months - Aser IT technologies - Bangalore (Jan 2024 - Mar 2024)',
        projects: 'Portfolio Website - React.js, CSS, HTML\ncustomer-churn-prediction-xgboost - XGBoost, Python',
        education: 'MCA - Mohan Babu University (2024-2026)\nBCA - Vijayam degree college (2021-2024)',
        achievements: '1ST prize at ANVESANA 2025',
        languages: 'English And Telugu'
      };
    case 'problem_hardware':
      return `Processor: Intel Core i3 or equivalent\nRAM: 4 GB\nHard Disk: 250 GB\n`;
    case 'problem_software':
      return `Operating System: Windows 10/11 or Ubuntu\nBackend: Node.js, Express.js\nFrontend: React.js\nDatabase: Firebase Firestore\n`;
    default:
      return '';
  }
};

// --- Main Component ---
const StudentDashboard = ({ user, onLogout }) => {

  // --- Resume Helper Functions ---
  const handleBioDataChange = (field, value) => {
    // Get the current bioData object
    const currentBioData = project?.sections?.bioData?.content || getDefaultContent('bioData', user, project);

    // Create the updated object
    const updatedBioData = {
      ...currentBioData,
      [field]: value
    };

    // --- THIS IS THE FIX ---
    // Directly update the project state
    setProject(prev => ({
      ...prev,
      sections: {
        ...(prev?.sections || {}),
        bioData: {
          ...(prev?.sections?.bioData || {}),
          content: updatedBioData
        }
      }
    }));
  };

  const renderWithBreaks = (text = '') => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };


  // This function now uses inline styles, removing the .css class
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
  // --- End of Resume Helpers ---

  const [project, setProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);

  // --- Paginated Content State ---
  const [paginatedContent, setPaginatedContent] = useState(['']);

  // --- PREVIEW FLIPPER STATE (REBUILT) ---
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // --- PASTE THIS IN PLACE of your old 'allPages' useMemo ---

  const allPages = useMemo(() => {
    const pages = [];
    // We must wait for the project to load, because we need to
    // know the number of pages for *each* section (pagination)
    if (!project || !user) return [];

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
      // e.g., certificate, abstract, literatureReview, bioData
      if (section.isPage && section.subsections.length === 0) {
        const content = project.sections?.[section.id]?.content;
        let contentPages = [];

        if (section.id === 'bioData') {
          contentPages = [content || getDefaultContent(section.id, user, project)];
        } else if (Array.isArray(content)) {
          contentPages = content.length > 0 ? content : [''];
        } else if (content) {
          contentPages = [content];
        } else {
          contentPages = [getDefaultContent(section.id, user, project)];
        }

        if (contentPages.length === 0) contentPages.push(getDefaultContent(section.id, user, project));

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
      // e.g., introduction, problemDefinition, systemDesign
      else if (!section.isPage && section.subsections.length > 0) {
        section.subsections.forEach(subSection => {
          // We already know subSection.isPage is true from the structure
          const content = project.sections?.[subSection.id]?.content;
          const contentPages = Array.isArray(content)
            ? (content.length > 0 ? content : [''])
            : (content ? [content] : [getDefaultContent(subSection.id, user, project)]);

          if (contentPages.length === 0) contentPages.push(getDefaultContent(subSection.id, user, project));

          contentPages.forEach((_, index) => {
            pages.push({
              id: `${subSection.id}_${index}`,
              title: subSection.title,
              pageIndex: index,
              sectionId: subSection.id, // This is key: e.g., 'intro_main'
              parentTitle: section.title
            });
          });
        });
      }

    });
    return pages;
  }, [project, user]); // This MUST depend on project and user

  // --- END OF REPLACEMENT BLOCK ---
  // This line must now use the new 'allPages' variable
  const totalPages = allPages.length;

  const [certData, setCertData] = useState({
    projectName: '',
    shortTitle: '', // <-- ADD THIS LINE
    degreeAwarded: 'Master of Computer Applications',
    batch: '2025-26',
    submissionDate: new Date().toISOString().split('T')[0],
    guideName: '',
    guideDesignation: '',
    hodName: 'Dr. M. Sowmya Vani',
    hodDesignation: 'Associate Professor & Head, Department of CA, MBU, Tirupati.'
  });

  // NOTE: The large, hard-coded 'bioData' state was removed.
  // It will be loaded from project.sections.bioData.content

  const [files, setFiles] = useState(null); // This is not used, but we'll leave it
  const [existingImages, setExistingImages] = useState([]); // This is also not used
  const [mentorName, setMentorName] = useState('Loading...');

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pdfPreviewRef = useRef(null);

  // --- Data Fetching (No Change) ---
  useEffect(() => {
    const fetchFullProject = async () => {
      setLoading(true);
      try {
        let fetchedMentorName = 'Mentor Not Assigned';
        let fetchedGuideDesignation = 'Assistant Professor, Department of CA, MBU,Tirupati.';

        if (user.assignedMentorId) {
          const { data: mentorData } = await api.get(`/users/profile?uid=${user.assignedMentorId}`);
          fetchedMentorName = mentorData.name || 'Mentor Name';
          if (mentorData.designation) {
            fetchedGuideDesignation = `${mentorData.designation}, ${mentorData.department || 'Department of CA, MBU,Tirupati.'}`;
          }
        }
        setMentorName(fetchedMentorName);

        const { data: projectData } = await api.get('/projects/my-project');
        setProject(projectData);

        const cert = projectData.sections?.certificate?.content || {};
        setCertData({
          projectName: cert.projectName || 'Sentiment Cinema: AI-Powered Movie Review Analyzer',
          shortTitle: cert.shortTitle || '', // <-- ADD THIS LINE
          degreeAwarded: cert.degreeAwarded || 'Master of Computer Applications',
          batch: cert.batch || '2025-26',
          submissionDate: cert.submissionDate || new Date().toISOString().split('T')[0],
          guideName: cert.guideName || fetchedMentorName,
          guideDesignation: cert.guideDesignation || fetchedGuideDesignation,
          hodName: cert.hodName || 'Dr. M. Sowmya Vani',
          hodDesignation: cert.hodDesignation || 'Associate Professor & Head, Department of CA, MBU,Tirupati.',
        });

        // Ensure bioData has defaults if it doesn't exist
        if (!projectData.sections?.bioData?.content) {
          setProject(prev => ({
            ...prev,
            sections: {
              ...(prev.sections || {}),
              bioData: {
                ...(prev.sections?.bioData || {}),
                content: getDefaultContent('bioData', user, prev)
              }
            }
          }));
        }

      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('No project found. Ready to create one.');
          setCertData(prev => ({ ...prev, guideName: mentorName }));
          // Create a default project object
          setProject({
            sections: {
              bioData: {
                content: getDefaultContent('bioData', user, null)
              }
            }
          });
        } else {
          setError('Could not fetch your project: ' + err.message);
        }
      }
      setLoading(false);
    };

    fetchFullProject();
  }, [user.assignedMentorId, user.name, user.rollNumber, user.email, user.phone, mentorName]); // Added user details


  // --- Arrow Key Navigation (No Change) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isModalOpen) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') handlePreviewNav('next');
      else if (e.key === 'ArrowLeft') handlePreviewNav('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, totalPages, isModalOpen]);


  // --- Modal Management ---
  const openEditModal = (sectionId) => {
    const section = allSections.find(s => s.id === sectionId);
    if (!section || section.id === 'toc') return;

    setEditingSectionId(sectionId);

    if (sectionId === 'certificate') {
      setPaginatedContent(['']); // Not used
    } else if (sectionId === 'bioData') {
      // BioData is an object, not paginated.
      // We don't need to do anything here, the editor will read from `project` state
      setPaginatedContent(['']); // Not used
    } else {
      // Handle all other text/image sections
      const content = project?.sections?.[sectionId]?.content;
      if (Array.isArray(content)) {
        setPaginatedContent(content.length > 0 ? content : ['']);
      } else if (content) {
        setPaginatedContent([content]); // Convert old data to array
      } else {
        setPaginatedContent([getDefaultContent(sectionId, user, project)]);
      }
    }

    setIsModalOpen(true);

    const pageIndex = allPages.findIndex(p => p.sectionId === sectionId);
    if (pageIndex !== -1) setCurrentPageIndex(pageIndex);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSectionId(null);
    setPaginatedContent(['']);
    setError('');
    setSuccess('');
  };

  // --- Paginated Editor Handlers (No Change) ---
  const handlePageContentChange = (index, text) => {
    const newPages = [...paginatedContent];
    newPages[index] = text;
    setPaginatedContent(newPages);
  };

  const addPage = () => {
    setPaginatedContent([...paginatedContent, '']);
  };

  const deletePage = (index) => {
    if (paginatedContent.length <= 1) {
      setPaginatedContent(['']);
      return;
    }
    const newPages = [...paginatedContent];
    newPages.splice(index, 1);
    setPaginatedContent(newPages);
  };

  // --- Save/Submit Section (MODIFIED) ---
  const handleSaveSection = async (status) => {
    if (!editingSectionId) return;

    setSaveLoading(true);
    setError('');
    setSuccess('');

    // --- THIS IS THE FIX ---
    let contentToSave;
    if (editingSectionId === 'certificate') {
      contentToSave = certData;
    } else if (editingSectionId === 'bioData') {
      contentToSave = project?.sections?.bioData?.content || getDefaultContent('bioData', user, project);
    } else {
      contentToSave = paginatedContent;
    }
    // --- END OF FIX ---

    try {
      await api.post('/projects/update-section', {
        section: editingSectionId,
        content: contentToSave,
        status: status
      });

      const currentSectionTitle = allSections.find(s => s.id === editingSectionId).title;
      setSuccess(`Section "${currentSectionTitle}" ${status === 'draft' ? 'saved' : 'submitted'}!`);

      // --- THIS IS THE FIX ---
      setProject(prev => {
        const newSections = {
          ...(prev?.sections || {}),
          [editingSectionId]: { // Use editingSectionId
            ...(prev?.sections?.[editingSectionId] || {}),
            content: contentToSave, // Use the content we just saved
            status: status
          }
        };
        return { ...prev, sections: newSections };
      });
      // --- END OF FIX ---

      setTimeout(closeModal, 1000);

    } catch (err) {
      setError('Failed to save section: ' + (err.response?.data?.message || err.message));
    }
    setSaveLoading(false);
  };

  // --- Section Image Upload (No Change) ---
  const handleSectionImageUpload = async (file) => {
    if (!file) return;

    setSaveLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('images', file);

    try {
      const { data } = await api.post('/projects/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = data.images[0];
      setPaginatedContent([imageUrl]);
      setSuccess('Image uploaded! Click "Save Draft" or "Submit" to confirm.');

    } catch (err) {
      setError('Failed to upload image: ' + (err.response?.data?.message || err.message));
    }
    setSaveLoading(false);
  };

  // --- Preview Page Navigation (No Change) ---
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


  // --- PDF Download (FIXED) ---
  const handleDownloadPDF = async () => {
    setLoading(true);
    setError('');
    const input = pdfPreviewRef.current;
    if (!input) {
      setError('Preview reference not found.');
      setLoading(false);
      return;
    }

    // --- FIX #2: Generate filename from user's roll number ---
    const studentRollNo = user.rollNumber || user.email?.split('@')[0] || 'ProjectReport';
    const filename = `${studentRollNo}.pdf`;
    // --- End of FIX #2 ---

    const pagesToPrint = input.querySelectorAll('.report-page-a4'); // This selector will now work
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();

    if (pagesToPrint.length === 0) {
      console.error("PDF Download Error: No pages found with selector '.report-page-a4'.");
      setError("PDF Download failed: Could not find any pages to print.");
      setLoading(false);
      return;
    }

    try {
      for (let i = 0; i < pagesToPrint.length; i++) {
        const page = pagesToPrint[i];

        // --- Simplified canvas logic ---
        // Temporarily set height to auto to capture all content
        page.style.height = 'auto';
        page.style.minHeight = 'auto';

        const canvas = await html2canvas(page, {
          scale: 2, // Keep scale for quality
          useCORS: true,
          width: page.scrollWidth,
          height: page.scrollHeight,
        });

        // Restore original styles
        page.style.height = '';
        page.style.minHeight = '';
        // --- End of simplified logic ---

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const ratio = pdfPageWidth / imgWidth;
        const canvasHeightInPDF = imgHeight * ratio;

        let heightLeft = canvasHeightInPDF;
        let position = 0;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, position, pdfPageWidth, canvasHeightInPDF, undefined, 'FAST');
        heightLeft -= pdfPageHeight;

        while (heightLeft > 0) {
          position = heightLeft - canvasHeightInPDF;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfPageWidth, canvasHeightInPDF, undefined, 'FAST');
          heightLeft -= pdfPageHeight;
        }
      }

      // --- FIX #2: Use the new filename ---
      pdf.save(filename);

    } catch (err) {
      console.error("PDF Download failed:", err);
      setError("PDF Download failed: " + err.message);
    }
    setLoading(false);
  };
  // --- Render Editor (MODIFIED) ---
  // This is the single, correct renderEditor function
  const renderEditor = () => {
    if (loading) return <p>Loading...</p>;

    const section = allSections.find(s => s.id === editingSectionId);

    if (editingSectionId === 'certificate') {
      return (
        <div className="form-group-grid">
          <div className="form-group"><label>Project Title (for Cert)</label><input type="text" className="form-input" value={certData.projectName} onChange={(e) => setCertData(p => ({ ...p, projectName: e.target.value }))} /></div>
          {/* VV PASTE THIS NEW BLOCK HERE VV */}
          <div className="form-group">
            <label>Short Title (for Header)</label>
            <input
              type="text"
              className="form-input"
              value={certData.shortTitle || ''}
              onChange={(e) => setCertData(p => ({ ...p, shortTitle: e.target.value }))}
              placeholder="e.g., 'PMS' or 'Report System'"
            />
          </div>
          {/* ^^ END OF NEW BLOCK ^^ */}
          <div className="form-group"><label>Degree</label><input type="text" className="form-input" value={certData.degreeAwarded} onChange={(e) => setCertData(p => ({ ...p, degreeAwarded: e.target.value }))} /></div>
          <div className="form-group"><label>Academic Year</label><input type="text" className="form-input" value={certData.batch} onChange={(e) => setCertData(p => ({ ...p, batch: e.target.value }))} /></div>
          <div className="form-group"><label>Submission Date</label><input type="date" className="form-input" value={certData.submissionDate} onChange={(e) => setCertData(p => ({ ...p, submissionDate: e.target.value }))} /></div>
          <div className="form-group"><label>Guide Name</label><input type="text" className="form-input" value={certData.guideName} onChange={(e) => setCertData(p => ({ ...p, guideName: e.target.value }))} /></div>
          <div className="form-group"><label>Guide Designation</label><input type="text" className="form-input" value={certData.guideDesignation} onChange={(e) => setCertData(p => ({ ...p, guideDesignation: e.target.value }))} /></div>
          <div className="form-group"><label>HOD Name</label><input type="text" className="form-input" value={certData.hodName} onChange={(e) => setCertData(p => ({ ...p, hodName: e.target.value }))} /></div>
          <div className="form-group"><label>HOD Designation</label><input type="text" className="form-input" value={certData.hodDesignation} onChange={(e) => setCertData(p => ({ ...p, hodDesignation: e.target.value }))} /></div>
        </div>
      );
    }

    // --- THIS IS THE NEW CASE FOR BIODATA ---
    if (editingSectionId === 'bioData') {
      const bioDataContent = project?.sections?.bioData?.content || getDefaultContent('bioData', user, project);
      return (
        <div className="structured-form-editor">
          <h3 className="editor-subtitle">Resume / Bio-Data</h3>

          <label>Full Name</label>
          <input
            type="text"
            className="editor-input"
            value={bioDataContent.name || ''}
            onChange={(e) => handleBioDataChange('name', e.target.value)}
            placeholder="e.g., Santhosh Gangasani"
          />

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label>Email</label>
              <input
                type="email"
                className="editor-input"
                value={bioDataContent.email || ''}
                onChange={(e) => handleBioDataChange('email', e.target.value)}
                placeholder="e.g., iamsanthoosh30@gmail.com"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Phone</label>
              <input
                type="tel"
                className="editor-input"
                value={bioDataContent.phone || ''}
                onChange={(e) => handleBioDataChange('phone', e.target.value)}
                placeholder="e.g., +91 91828..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label>LinkedIn URL</label>
              <input
                type="text"
                className="editor-input"
                value={bioDataContent.linkedin || ''}
                onChange={(e) => handleBioDataChange('linkedin', e.target.value)}
                placeholder="Full URL to your LinkedIn profile"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>GitHub URL</label>
              <input
                type="text"
                className="editor-input"
                value={bioDataContent.github || ''}
                onChange={(e) => handleBioDataChange('github', e.target.value)}
                placeholder="Full URL to your GitHub profile"
              />
            </div>
          </div>

          <label>Professional Summary</label>
          <textarea
            className="editor-textarea"
            rows="5"
            value={bioDataContent.summary || ''}
            onChange={(e) => handleBioDataChange('summary', e.target.value)}
            placeholder="Write a brief professional summary..."
          />

          <label>Core Technical Skills (Separate with commas)</label>
          <textarea
            className="editor-textarea"
            rows="3"
            value={bioDataContent.techSkills || ''}
            onChange={(e) => handleBioDataChange('techSkills', e.target.value)}
            placeholder="e.g., Python, React.js, TensorFlow, SQL"
          />

          <label>Soft Skills (Separate with commas)</label>
          <textarea
            className="editor-textarea"
            rows="3"
            value={bioDataContent.softSkills || ''}
            onChange={(e) => handleBioDataChange('softSkills', e.target.value)}
            placeholder="e.g., Collaboration, Communication, Problem-solving"
          />

          <label>Experience / Internships (One per line)</label>
          <textarea
            className="editor-textarea"
            rows="5"
            value={bioDataContent.experience || ''}
            onChange={(e) => handleBioDataChange('experience', e.target.value)}
            placeholder="e.g., React.js Intern - Aser IT (Jan 2024 - Mar 2024)"
          />

          <label>Projects (One per line)</label>
          <textarea
            className="editor-textarea"
            rows="5"
            value={bioDataContent.projects || ''}
            onChange={(e) => handleBioDataChange('projects', e.target.value)}
            placeholder="e.g., Portfolio Website - React.js, CSS, HTML"
          />

          <label>Education (One per line)</label>
          <textarea
            className="editor-textarea"
            rows="4"
            value={bioDataContent.education || ''}
            onChange={(e) => handleBioDataChange('education', e.target.value)}
            placeholder="e.g., MCA - Mohan Babu University (2024-2026)"
          />
        </div>
      );
    }
    // --- END OF BIODATA CASE ---

    if (section && section.inputType === 'image') {
      const imageUrl = paginatedContent[0] || null;
      return (
        <div className="section-image-uploader">
          <div className="form-group">
            <label>Upload Diagram</label>
            <input
              type="file"
              accept="image/png, image/jpeg"
              className="form-input"
              onChange={(e) => handleSectionImageUpload(e.target.files[0])}
              disabled={saveLoading}
            />
          </div>
          {saveLoading && <p>Uploading...</p>}
          {imageUrl && (
            <div className="image-preview-container">
              <label>Current Image:</label>
              <img src={imageUrl} alt="Diagram Preview" className="editor-image-preview" />
            </div>
          )}
          {!imageUrl && !saveLoading && (
            <p>No image uploaded for this section yet.</p>
          )}
        </div>
      );
    }

    // --- NEW SMART LINE COUNTER LOGIC ---
    const parentSection = reportStructure.find(s => s.subsections.find(sub => sub.id === editingSectionId));

    return (
      <div className="paginated-editor">
        {paginatedContent.map((pageText, index) => {

          const isFirstPage = index === 0;
          let lineLimit = 45; // Default for continuation pages
          let limitMessage = `(Continuation Page)`;

          if (isFirstPage) {
            const isFirstSubsection = parentSection && parentSection.subsections[0].id === editingSectionId;
            const hasParentTitle = parentSection != null;
            const hasSubHeading = hasParentTitle;
            const hasMainHeading = !hasParentTitle || isFirstSubsection;

            if (hasMainHeading && hasSubHeading) { // e.g., 1.1 Introduction
              lineLimit = 38;
              limitMessage = `(Page with Main + Sub-Heading)`;
            } else if (hasMainHeading) { // e.g., Abstract
              lineLimit = 42;
              limitMessage = `(Page with Main Heading)`;
            } else if (hasSubHeading) { // e.g., 1.2 Aim of Project
              lineLimit = 42;
              limitMessage = `(Page with Sub-Heading)`;
            }
          }

          const lineCount = pageText.split('\n').length;
          const isOverLimit = lineCount > lineLimit;

          return (
            <div key={index} className="page-editor-group">
              <div className="page-editor-header">
                <h4>Page {index + 1}</h4>
                <button
                  onClick={() => deletePage(index)}
                  className="delete-page-btn"
                  disabled={paginatedContent.length <= 1}
                >
                  &times;
                </button>
              </div>
              <textarea
                className={`form-textarea main-editor ${isOverLimit ? 'over-limit' : ''}`}
                value={pageText}
                onChange={(e) => handlePageContentChange(index, e.target.value)}
                placeholder="Start writing your content here..."
              />
              <div className="page-editor-footer">
                <span className={`line-counter ${isOverLimit ? 'line-warning' : ''}`}>
                  Lines: {lineCount} / {lineLimit}
                </span>
                <span className="line-limit-message">
                  {isOverLimit ? "Page is long. Move text to a new page." : limitMessage}
                </span>
              </div>
            </div>
          );
        })}
        <button onClick={addPage} className="form-button add-page-btn">
          + Add New Page
        </button>
      </div>
    );
  };

  //
  // --- PASTE THIS ENTIRE FUNCTION INTO YOUR StudentDashboard.js ---
  //
  //
  // --- PASTE THIS ENTIRE FUNCTION INTO YOUR StudentDashboard.js ---
  //
  const renderPreview = () => {
    // --- This check is now for 'allPages' ---
    if (!project || !user || allPages.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          <p>Loading project preview...</p>
        </div>
      );
    }

    // --- Reusable Inline Styles (Unchanged) ---
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
    const studentRollNo = user.rollNumber || user.email?.split('@')[0] || '[RollNo]';

    // --- NEW: Split reportStructure for TOC pages ---
    // We filter out 'toc' and 'images' from the list
    const tocItems = reportStructure.filter(s => s.id !== 'toc' && s.id !== 'images');
    const splitIndex = 7; // Split after 7 items
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
                  <div id="page-certificate" className="report-page-a4" style={{
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
                    {/* ... (All certificate content is unchanged) ... */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "10px" }}>
                      <img src={MBU_Logo} alt="MBU Logo" style={{ width: "110px", height: "auto", marginRight: "15px" }} />
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
                          {user.name || "[Student Name]"}
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
                    {/* --- Render only Page 1 items --- */}
                    {tocPage1Items.map((sec) => (
                      <React.Fragment key={sec.id}>
                        <li style={styles.tocItem}>
                          <span>{sec.title}</span>
                          {/* --- ADDED THIS LINE --- */}
                          <span>{getPageNumForSection(sec.id)}</span>
                        </li>
                        {sec.subsections.length > 0 && (
                          <ul style={styles.tocSubList}>
                            {sec.subsections.map((sub) => (
                              <li key={sub.id} style={styles.tocSubItem}>
                                <span>{sub.title}</span>
                                {/* --- AND ADDED THIS LINE --- */}
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
                  {/* No main heading on the second page */}
                  <div style={{ height: '30px' }}></div>
                  <ul style={styles.tocList}>
                    {/* --- Render only Page 2 items --- */}
                    {tocPage2Items.map((sec) => (
                      <React.Fragment key={sec.id}>
                        <li style={styles.tocItem}>
                          <span>{sec.title}</span>
                          {/* --- ADDED THIS LINE --- */}
                          <span>{getPageNumForSection(sec.id)}</span>
                        </li>
                        {sec.subsections.length > 0 && (
                          <ul style={styles.tocSubList}>
                            {sec.subsections.map((sub) => (
                              <li key={sub.id} style={styles.tocSubItem}>
                                <span>{sub.title}</span>
                                {/* --- AND ADDED THIS LINE --- */}
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
              const bioDataContent = project?.sections?.bioData?.content || getDefaultContent('bioData', user, project);
              pageContent = (
                <div style={styles.resumePage}>
                  {/* ... (All resume content is unchanged) ... */}
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
              const content = project?.sections?.[sectionId]?.content;
              const defaultText = getDefaultContent(sectionId, user, project);
              let contentPages = [];
              if (Array.isArray(content)) contentPages = content.length > 0 ? content : [defaultText];
              else if (content) contentPages = [content];
              else contentPages = [defaultText];
              const pageText = contentPages[subPageIndex] || '';

              const parentSection = parentTitle ? reportStructure.find(s => s.title === parentTitle) : null;
              const isFirstSubsection = parentSection && parentSection.subsections[0].id === sectionId;

              pageContent = (
                <>
                  {/* --- THIS BLOCK IS NOW FIXED --- */}
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
                  {/* --- THIS LINE IS FIXED: Added '&& subPageIndex === 0' --- */}
                  {parentTitle && subPageIndex === 0 && (
                    <h4 style={styles.subHeading}>
                      {title}
                    </h4>
                  )}
                  {/* --- END OF FIX --- */}

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
                <div className="report-page-a4" style={styles.a4Page}>

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
  // --- Get Section Status (No Change) ---
  const getSectionStatus = (sectionId) => {
    const parentSection = reportStructure.find(s => s.subsections.find(sub => sub.id === sectionId));
    if (parentSection) {
      return project?.sections?.[sectionId]?.status || 'empty';
    }
    const mainSection = reportStructure.find(s => s.id === sectionId);
    if (mainSection) {
      if (mainSection.subsections.length > 0) {
        const subStatuses = mainSection.subsections.map(sub => project?.sections?.[sub.id]?.status || 'empty');
        if (subStatuses.every(s => s === 'approved')) return 'approved';
        if (subStatuses.some(s => s === 'rejected')) return 'rejected';
        if (subStatuses.some(s => s === 'pending')) return 'pending';
        if (subStatuses.some(s => s === 'draft')) return 'draft';
        return 'empty';
      } else {
        return project?.sections?.[sectionId]?.status || 'empty';
      }
    }
    return 'empty';
  }

  // --- Main Render (No Change) ---
  return (
    <div className="student-dashboard">
      <header className="student-header">
        <h1>Student Dashboard</h1>
        <div className="header-user-info">
          <span>Welcome, {user.name}</span>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </header>

      <main className="student-main">
        <div className="dashboard-container">

          <div className="column-card section-nav-wrapper">
            <div className="section-nav">
              <ul className="nav-list">
                {reportStructure.map(section => {
                  const isClickable = section.isPage || (section.subsections.length === 0 && section.id === 'images');
                  const isNonEditable = !section.isPage && section.subsections.length > 0;

                  return (
                    <li key={section.id} className="nav-item-main">
                      <span
                        className={`
                          status-${getSectionStatus(section.id)}
                          ${isNonEditable ? 'non-editable' : ''}
                        `}
                        onClick={isClickable ? () => openEditModal(section.id) : null}
                      >
                        <span className="status-dot"></span>
                        {section.title}
                      </span>
                      {section.subsections.length > 0 && (
                        <ul className="nav-sub-list">
                          {section.subsections.map(sub => (
                            <li
                              key={sub.id}
                              className={`nav-item-sub status-${getSectionStatus(sub.id)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(sub.id);
                              }}
                            >
                              <span className="status-dot"></span>
                              {sub.title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="column-card preview-card">
            <div className="preview-header">
              <h2 className="card-title">Live Report Preview</h2>
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
              <button
                className="download-button"
                onClick={handleDownloadPDF}
                disabled={!project || loading || saveLoading}
              >
                {(loading || saveLoading) ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
            {renderPreview()}
          </div>
        </div>
      </main>

      {/* --- Editor Modal (No Change) --- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h3 className="editor-title">
                Editing: {allSections.find(s => s.id === editingSectionId)?.title}
              </h3>
              <button onClick={closeModal} className="modal-close-button">&times;</button>
            </div>

            <div className="modal-body">
              {error && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}
              {renderEditor()}
            </div>

            <div className="modal-footer">
              <div className="form-button-group">
                <button className="form-button save-draft" onClick={() => handleSaveSection('draft')} disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Save Draft'}
                </button>
                <button className="form-button submit-review" onClick={() => handleSaveSection('pending')} disabled={saveLoading}>
                  {saveLoading ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;