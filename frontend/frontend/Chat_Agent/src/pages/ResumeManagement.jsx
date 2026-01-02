import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResumeStatus, uploadResume } from '../services/apiService';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';

const ResumeManagement = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [resumeStatus, setResumeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [resumeKey, setResumeKey] = useState(Date.now());

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

    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF file');
      return;
    }

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
      await fetchResumeStatus();
      setResumeKey(Date.now());
      setUploadSuccess(true);
      
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
      <div className="min-h-screen bg-[#0d0b1a]">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex pt-[72px]">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center min-h-[calc(100vh-138px)]">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/50">Loading resume status...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[72px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Resume Management
              </h1>
              <p className="text-white/60 text-lg">
                Upload or update your resume for AI-powered interview preparation
              </p>
            </div>

            {/* Success Message */}
            {uploadSuccess && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-400 font-semibold">Resume uploaded successfully!</p>
              </div>
            )}

            {/* Current Resume Status */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)] mb-8">
              <h2 className="text-xl font-bold text-white mb-6">Current Resume Status</h2>
              
              <div className="flex items-center gap-6 mb-6">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                  resumeStatus?.hasResume 
                    ? 'bg-gradient-to-br from-green-500 to-cyan-500' 
                    : 'bg-white/10'
                }`}>
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {resumeStatus?.hasResume ? 'Resume Uploaded' : 'No Resume Uploaded'}
                  </h3>
                  {resumeStatus?.hasResume && resumeStatus.metadata ? (
                    <div className="space-y-2">
                      <p className="text-white/70">
                        <span className="font-semibold text-white/90">Seniority Level:</span> {resumeStatus.metadata.seniorityLevel}
                      </p>
                      <div>
                        <span className="font-semibold text-white/90">Skills Detected:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {resumeStatus.metadata.skills && resumeStatus.metadata.skills.length > 0 ? (
                            resumeStatus.metadata.skills.map((skill, index) => (
                              <span 
                                key={index} 
                                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm font-medium rounded-full border border-cyan-500/30"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-white/40 text-sm">No skills detected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/50">Upload your resume to get started with AI interviews</p>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Section or PDF Viewer */}
            {resumeStatus?.hasResume ? (
              <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Your Resume</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate('/dashboard/resume/ats-score')}
                      className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-5 py-2 rounded-lg hover:from-purple-500 hover:to-cyan-500 transition text-sm font-semibold flex items-center gap-2 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Rate Your Resume
                    </button>
                    <button
                      onClick={() => setResumeStatus({ ...resumeStatus, hasResume: false })}
                      className="px-4 py-2 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition text-sm font-semibold"
                    >
                      Upload New Resume
                    </button>
                  </div>
                </div>

                {/* PDF Viewer */}
                <div className="border border-[rgba(0,217,255,0.2)] rounded-xl overflow-hidden bg-[#0d0b1a]" style={{ height: '600px' }}>
                  <iframe
                    key={resumeKey}
                    src={`http://localhost:8000/api/resume/${(() => {
                      try {
                        const user = JSON.parse(localStorage.getItem('user'));
                        return user?.userId || '';
                      } catch {
                        return '';
                      }
                    })()}/file?t=${resumeKey}#toolbar=0`}
                    className="w-full h-full"
                    title="Resume PDF"
                  />
                </div>
                <p className="text-xs text-white/30 mt-2 text-center">
                  If the PDF doesn't display, try refreshing the page or re-uploading your resume.
                </p>
              </div>
            ) : (
              <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
                <h2 className="text-xl font-bold text-white mb-6">
                  Upload Resume
                </h2>
                
                <div className="border-2 border-dashed border-cyan-500/30 rounded-2xl p-12 text-center hover:border-cyan-500/50 transition bg-[#0d0b1a]/50">
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
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-white mb-3">
                      {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-white/50 mb-2">PDF only (Max 10MB)</p>
                    <p className="text-sm text-white/30">
                      Your resume will be analyzed by AI to generate personalized interview questions
                    </p>
                  </label>
                </div>

                {uploadError && (
                  <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-400">{uploadError}</p>
                  </div>
                )}

                {uploading && (
                  <div className="mt-6">
                    <div className="w-full bg-[#0d0b1a] rounded-full h-3">
                      <div className="bg-gradient-to-r from-purple-600 to-cyan-500 h-3 rounded-full animate-pulse" style={{width: '70%'}}></div>
                    </div>
                    <p className="text-sm text-white/50 text-center mt-3">Processing your resume...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResumeManagement;
