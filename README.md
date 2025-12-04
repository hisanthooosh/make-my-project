# Project Report Management System

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=Cloudinary&logoColor=white)

A full-stack web application designed to streamline the creation, submission, and management of academic project reports for students and faculty. This system provides a guided, section-by-section interface to ensure report consistency and automates the final PDF generation.

## 🌟 Features

* **Student Dashboard**: A central hub for students to create, edit, and track the status of their report sections.
* **Structured Report Building**: Enforces a pre-defined, hierarchical report structure, from the Certificate page to References.
* **Live A4 Preview**: A real-time, paginated preview that shows exactly how the final document will look.
* **Image Uploads for Diagrams**: Students can upload images for specific sections like UML diagrams, which are hosted on Cloudinary.
* **One-Click PDF Generation**: Generates and downloads a complete, professionally formatted PDF of the entire report using `jsPDF` and `html2canvas`.
* **Role-Based Access Control**: Separate dashboards and functionalities for Students, Faculty, and HODs, protected by middleware.

## 🛠️ Tech Stack

### Frontend
* **Framework**: React.js
* **Routing**: React Router (`react-router-dom`)
* **HTTP Client**: Axios
* **PDF Generation**: jsPDF, html2canvas
* **Authentication**: Firebase Authentication

### Backend
* **Framework**: Node.js, Express.js
* **Database**: Firebase Firestore
* **Image Storage**: Cloudinary
* **File Uploads**: Multer
* **CORS**: `cors` middleware

## 🚀 Getting Started

### Prerequisites

* Node.js and npm
* A Firebase project with Firestore and Authentication enabled.
* A Cloudinary account for API credentials.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    npm install
    ```
    * Create a `.env` file in the `/backend` directory and add your credentials:
        ```env
        # Firebase Service Account Key (as a single-line JSON string or path to file)
        FIREBASE_SERVICE_ACCOUNT='...'

        # Cloudinary Credentials
        CLOUDINARY_CLOUD_NAME=your_cloud_name
        CLOUDINARY_API_KEY=your_api_key
        CLOUDINARY_API_SECRET=your_api_secret

        # Port
        PORT=5000
        ```

3.  **Setup Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```
    * Create a `.env` file in the `/frontend` directory and add your Firebase client-side config:
        ```env
        REACT_APP_FIREBASE_API_KEY=your_api_key
        REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
        REACT_APP_FIREBASE_PROJECT_ID=your_project_id
        REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
        REACT_APP_FIREBASE_APP_ID=your_app_id
        ```

### Running the Application

1.  **Start the backend server:**
    * From the `/backend` directory:
        ```bash
        npm run dev
        ```
    * The server will run on `http://localhost:5000`.

2.  **Start the frontend application:**
    * From the `/frontend` directory:
        ```bash
        npm start
        ```
    * The React app will open on `http://localhost:3000`.

## 📁 Project Structure
. ├── backend/ │ ├── controllers/ # Handles business logic │ ├── middleware/ # For auth and file uploads │ ├── routes/ # API route definitions │ └── server.js # Main server entry point │ └── frontend/ ├── public/ └── src/ ├── assets/ # Images and logos ├── components/ # (if any) Reusable components ├── pages/ # Main page components (Dashboards, Auth) ├── App.js # Main app component and router setup └── index.js # Frontend entry point
## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
