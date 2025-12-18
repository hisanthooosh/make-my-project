// File: frontend/src/pages/LegalContents.js
import React from 'react';

// 1. TERMS AND CONDITIONS
export const TermsContent = () => (
  <div>
    <p>Welcome to <strong>Make My Project</strong>.</p>
    <p>By using our website and services, you agree to the following terms:</p>
    <ul>
      <li><strong>Usage:</strong> Our services are designed to assist students in generating project reports for academic purposes.</li>
      <li><strong>Account:</strong> You are responsible for maintaining the confidentiality of your login details.</li>
      <li><strong>Payments:</strong> All payments for premium features are processed securely via Razorpay.</li>
      <li><strong>Intellectual Property:</strong> The reports generated are intended for your personal academic use.</li>
    </ul>
  </div>
);

// 2. PRIVACY POLICY
export const PrivacyContent = () => (
  <div>
    <p>At <strong>Make My Project</strong>, we take your privacy seriously.</p>
    <p><strong>What we collect:</strong></p>
    <ul>
      <li>Name, Email, and Phone Number (for account creation).</li>
      <li>Academic details (Roll Number, Class, Department).</li>
      <li>Project details (uploaded images, abstracts) to generate your report.</li>
    </ul>
    <p><strong>How we use it:</strong> We use this data solely to generate your project PDF and manage your subscription. We do not sell your data to third parties.</p>
  </div>
);

// 3. REFUND POLICY (Updated with your 1-2 day rule)
export const RefundContent = () => (
  <div>
    <p>We strive to provide the best report generation service.</p>
    <p><strong>Refund Eligibility:</strong></p>
    <ul>
      <li>If you are not satisfied with the service or face a technical failure, you may request a refund.</li>
      <li><strong>Timeline:</strong> Refund requests must be raised within <strong>2 days</strong> of the transaction.</li>
      <li><strong>Processing Time:</strong> Approved refunds will be processed and credited back to your source account within <strong>1 to 2 business days</strong>.</li>
    </ul>
  </div>
);

// 4. CONTACT US (Updated with your details)
export const ContactContent = () => (
  <div>
    <p>We are here to help you!</p>
    <p><strong>Contact Details:</strong></p>
    <ul style={{ listStyleType: 'none', padding: 0 }}>
      <li><strong>Email:</strong> <a href="mailto:iamsanthoosh30@gmail.com">iamsanthoosh30@gmail.com</a></li>
      <li><strong>Phone:</strong> +91 91828 45569</li>
      <li><strong>Address:</strong> Make My Project Team, Tirupati, India.</li>
    </ul>
    <p>For any technical issues or refund requests, please contact us via email or phone.</p>
  </div>
);