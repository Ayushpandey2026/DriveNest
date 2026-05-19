# 🚀 DriveNest

### Smart Nested File Management Platform 

![React](https://img.shields.io/badge/React-Frontend-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-darkgreen?style=for-the-badge&logo=mongodb)
![JWT](https://img.shields.io/badge/JWT-Authentication-orange?style=for-the-badge)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Storage-blue?style=for-the-badge)

## 📌 Overview
**DriveNest** is a full-stack cloud-based file management application inspired by Google Drive. It allows users to securely create nested folders, upload images, calculate recursive folder sizes, and manage their own private file space with authentication and access control.

---

## ✨ Features
- 🔐 User Signup / Login / Logout
- 📁 Create Nested Folders (Google Drive-like hierarchy)
- 🖼 Upload Images with Cloudinary
- 📊 Recursive Folder Size Calculation
- 👤 User-Specific Access Control
- 🔒 JWT Authentication with bcrypt
- 🍪 Cookie-based secure authentication
- 🌍 Fully deployed frontend + backend

---

## 🛠 Tech Stack
**Frontend:** React.js, Vite, React Router DOM, Axios, Tailwind CSS, Context API  
**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, multer, Cloudinary, cookie-parser, cors

---

<pre>
DriveNest/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── App.jsx
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.js
│
└── README.md
</pre>

## 📂 Installation Guide

### Clone Repository
```bash
git clone https://github.com/Ayushpandey2026/DriveNest.git
cd DriveNest
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

Create a `.env` file inside backend:

```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file inside frontend:

```env
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Deployment
**Frontend:** Vercel  
**Backend:** Render  
**Database:** MongoDB Atlas  
**Storage:** Cloudinary

---

## ⚡ Optimization Highlights
- Fixed production CORS origin mismatch issue
- Implemented secure JWT cookie-based authentication
- Added modular scalable backend architecture
- Ownership validation for secure user-specific access
- Recursive folder size calculation logic
- Environment-based API configuration for smooth deployment

---

## ✅  Requirements Covered
✔ User Signup  
✔ User Login  
✔ User Logout  
✔ Nested Folder Creation  
✔ Recursive Folder Size Calculation  
✔ Image Upload  
✔ User-Specific Access Control  
✔ Node.js Authentication

---

## 👨‍💻 Author
**Ayush Pandey**  
Full Stack Developer | MERN Stack Developer
