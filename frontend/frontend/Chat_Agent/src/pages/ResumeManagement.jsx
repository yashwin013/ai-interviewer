import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResumeStatus, uploadResume } from '../services/apiService';
import Header from './Header';

const ResumeManagement = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [resumeStatus, setResumeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    fetchResumeStatus();
  }, []);

  const fetchResumeStatus = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/');
        return;
      }

      const user = JSON.parse(userStr);
      if (!user || !user.userId) {
        navigate('/');
        return;
      }

      const status = await getResumeStatus(user.userId);
      setResumeStatus(status);
    } catch (error) {
      console.error('Failed to fetch resume status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);

      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr);

      await uploadResume(user.userId, file);
      
      // Refresh resume status
      await fetchResumeStatus();
      
      setUploadSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.response?.data?.detail || 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="pt-[138px] flex items-center justify-center min-h-[calc(100vh-138px)]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading resume status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="pt-[138px] p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-purple-600 hover:text-purple-700 font-semibold mb-4 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Resume Management
            </h1>
            <p className="text-gray-600 text-lg">
              Upload or update your resume for AI-powered interview preparation
            </p>
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700 font-semibold">Resume uploaded successfully!</p>
            </div>
          )}

          {/* Current Resume Status */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Current Resume Status</h2>
            
            <div className="flex items-center gap-6 mb-6">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                resumeStatus?.hasResume 
                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {resumeStatus?.hasResume ? '✓ Resume Uploaded' : '○ No Resume Uploaded'}
                </h3>
                {resumeStatus?.hasResume && resumeStatus.metadata ? (
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      <span className="font-semibold">Seniority Level:</span> {resumeStatus.metadata.seniorityLevel}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-semibold">Skills Detected:</span> {resumeStatus.metadata.skillsCount} skills
                    </p>
                    {resumeStatus.metadata.name !== 'Unknown' && (
                      <p className="text-gray-600">
                        <span className="font-semibold">Name:</span> {resumeStatus.metadata.name}
                      </p>
                    )}
                    {resumeStatus.metadata.email !== 'Unknown' && (
                      <p className="text-gray-600">
                        <span className="font-semibold">Email:</span> {resumeStatus.metadata.email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Upload your resume to get started with AI interviews</p>
                )}
              </div>
            </div>
          </div>

          {/* Upload Section or PDF Viewer */}
          {resumeStatus?.hasResume ? (
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Your Resume</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/dashboard/resume/ats-score')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Rate Your Resume
                  </button>
                  <button
                    onClick={() => setResumeStatus({ ...resumeStatus, hasResume: false })}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
                  >
                    Upload New Resume
                  </button>
                </div>
              </div>

              
              {/* PDF Viewer */}
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100" style={{ height: '800px' }}>
                <iframe
                  src={`http://localhost:8000/api/resume/${(() => {
                    try {
                      const user = JSON.parse(localStorage.getItem('user'));
                      return user?.userId || '';
                    } catch {
                      return '';
                    }
                  })()}/file#toolbar=0`}
                  className="w-full h-full"
                  title="Resume PDF"
                  onError={(e) => {
                    console.error('PDF load error:', e);
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                If the PDF doesn't display, try refreshing the page or re-uploading your resume.
              </p>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Upload Resume
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-purple-400 transition">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  className="hidden"
                  id="resume-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="resume-upload"
                  className="cursor-pointer block"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-800 mb-3">
                    {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-gray-500 mb-2">PDF only (Max 10MB)</p>
                  <p className="text-sm text-gray-400">
                    Your resume will be analyzed by AI to generate personalized interview questions
                  </p>
                </label>
              </div>

              {uploadError && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{uploadError}</p>
                </div>
              )}

              {uploading && (
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full animate-pulse" style={{width: '70%'}}></div>
                  </div>
                  <p className="text-sm text-gray-500 text-center mt-3">Processing your resume...</p>
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How it works
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Upload your resume in PDF format</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Our AI analyzes your experience, skills, and seniority level</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Interview questions are tailored to your background</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Update anytime to practice for different roles</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeManagement;
