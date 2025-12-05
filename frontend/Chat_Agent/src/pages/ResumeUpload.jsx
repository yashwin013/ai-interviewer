import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import { uploadResume } from "../services/apiService";

const ResumeUpload = ({ userEmail, onLogout }) => {
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!resumeFile) {
      setError("Please upload a resume file.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Get userId from localStorage
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        setError("User not found. Please login again.");
        setLoading(false);
        return;
      }

      // Call API to upload resume
      const response = await uploadResume(user.userId, resumeFile);

      // Navigate to resume summary with actual data
      navigate("/resume-summary", {
        state: { resumeProfile: response.resumeProfile },
      });
    } catch (err) {
      console.error("Resume upload error:", err);
      setError(
        err.response?.data?.detail || 
        "Failed to upload resume. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header userEmail={userEmail} onLogout={onLogout} />
      <div className="mt-32 mx-auto w-full max-w-xl bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
          Upload Your Resume
        </h2>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition">
          <p className="text-gray-600 mb-3">
            Drag & drop or click to select
          </p>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              setResumeFile(e.target.files[0]);
              setError("");
            }}
            className="w-full cursor-pointer text-sm text-gray-700"
            disabled={loading}
          />
        </div>
        {resumeFile && (
          <p className="mt-4 text-center text-green-600 font-medium">
            Selected: {resumeFile.name}
          </p>
        )}
        {error && (
          <div className="mt-4 bg-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={loading}
          className="mt-6 w-full py-3 bg-blue-600 text-white text-lg font-semibold rounded-xl shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Uploading..." : "Upload & Generate Summary"}
        </button>
      </div>
      <footer className="text-center py-4 text-sm text-gray-500 mt-auto">
        © 2025 AI Interview Studio — Powered by Smart AI
      </footer>
    </div>
  );
};

export default ResumeUpload;
