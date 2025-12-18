// File: frontend/src/pages/PolicyPage.js
import React from 'react';
import { Link } from 'react-router-dom';

const PolicyPage = ({ title, ContentComponent }) => {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      <h1 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>{title}</h1>
      
      <div style={{ marginTop: '20px', color: '#333' }}>
        {/* Render the specific content component passed from App.js */}
        <ContentComponent />
      </div>

      <div style={{ marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <Link to="/" style={{ color: '#0072ff', textDecoration: 'none', fontWeight: 'bold' }}>&larr; Back to Home</Link>
      </div>
    </div>
  );
};

export default PolicyPage;