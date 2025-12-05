import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ResumeUpload from "./pages/ResumeUpload";
import ResumeSummary from "./pages/ResumeSummary";
import InterviewPage from "./pages/InterviewPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        setIsLoggedIn(true);
        setUserData(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogin = (data) => {
    setIsLoggedIn(true);
    setUserData(data);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            !isLoggedIn ? (
              <LoginPage onLogin={handleLogin} />
            ) : (
              <Navigate to="/upload" replace />
            )
          }
        />
        <Route
          path="/upload"
          element={
            isLoggedIn ? (
              <ResumeUpload userEmail={userData?.email} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/resume-summary"
          element={
            isLoggedIn ? (
              <ResumeSummary />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/start-interview"
          element={
            isLoggedIn ? (
              <InterviewPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route
          path="/SignupPage"
          element={
              <SignupPage />
          }
        />
      </Routes>
    </>
  );
}

export default App;
