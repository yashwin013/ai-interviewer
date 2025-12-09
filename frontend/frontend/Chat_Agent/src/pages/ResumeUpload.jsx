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
      const response = await uploadResume(user.userId, resumeFile);
      navigate("/resume-summary", {
  state: { resumeProfile: response.resumeProfile },      });
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header userEmail={userEmail} onLogout={onLogout} />
      <div className="relative bg-[#9eb5b3] min-h-[600px] flex items-center justify-center overflow-hidden ">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-2xl"></div>
        </div>

        <div className="relative z-10 w-full max-w-4xl px-6 text-center">

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-md">
            Upload your resume on AI INTERVIEW
          </h1>

          <p className="text-xl md:text-2xl text-white/90 mb-12 italic font-light">
            and let the right job find <span className="font-semibold not-italic">you!</span>
          </p>

          {/* Upload Card */}
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-xl mx-auto transform transition-all hover:scale-105 duration-300">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${resumeFile ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-[#6e46ae]"
                }`}
            >
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  setResumeFile(e.target.files[0]);
                  setError("");
                }}
                className="hidden"
                disabled={loading}
              />
              <label
                htmlFor="resume-upload"
                className="cursor-pointer block"
              >
                {resumeFile ? (
                  <div>
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-green-700 font-medium truncate px-4">{resumeFile.name}</p>
                    <p className="text-xs text-green-500 mt-1">Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 bg-[#f0f0ff] text-[#6e46ae] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">Drag and drop or click to upload</p>
                    <p className="text-sm text-gray-400">Supported formats: PDF, DOC, DOCX</p>
                  </div>
                )}
              </label>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading}
              className={`mt-6 w-full py-4 text-white text-lg font-bold rounded-lg shadow-lg transition-all transform active:scale-95 ${loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#6e46ae] hover:bg-[#56368b] hover:shadow-xl"
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Resume...
                </span>
              ) : (
                "Upload Your Resume"
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2">
            <div className="hidden md:block w-full h-64 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-gray-400">                <img
              src="/resume-tips.png"
              alt="Resume Tips"
              className="rounded-lg shadow-lg opacity-80 w-full h-64 object-cover"
              onError={(e) => (e.target.style.display = "none")}
            />
            </div>
          </div>

          <div className="md:w-1/2 text-left">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Why use AI Interview Studio?</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">✓</div>
                <p className="text-gray-600">Get instant feedback on your resume structure and content.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">✓</div>
                <p className="text-gray-600">Practice with AI-generated questions tailored to your profile.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">✓</div>
                <p className="text-gray-600">Increase your chances of landing your dream job.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="bg-[#1e0c3e] text-white/70 py-8 text-center text-sm mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <p>© 2025 AI Interview Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ResumeUpload;
