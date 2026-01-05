import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';
import { getRecommendedJobs, getUserResults, getResumeStatus, uploadResume } from '../services/apiService';

const Dashboard = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendationMessage, setRecommendationMessage] = useState('');
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0
  });
  
  // Resume state
  const [resumeStatus, setResumeStatus] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    fetchJobs();
    fetchStats();
    fetchResumeStatus();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      if (!user || !user.userId) return;

      const response = await getRecommendedJobs(user.userId);
      setJobs(response.jobs || []);
      setRecommendationMessage(response.message || '');
    } catch (error) {
      console.error('Failed to fetch recommended jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      if (!user || !user.userId) return;

      const results = await getUserResults(user.userId);
      
      if (results && results.length > 0) {
        const scores = results.map(r => parseInt(r.assessment?.candidate_score_percent || 0));
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / results.length);
        
        setStats({
          totalInterviews: results.length,
          averageScore: avgScore
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchResumeStatus = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      if (!user || !user.userId) return;

      const status = await getResumeStatus(user.userId);
      setResumeStatus(status);
    } catch (error) {
      console.error('Failed to fetch resume status:', error);
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

      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr);

      await uploadResume(user.userId, file);
      await fetchResumeStatus();
      setShowUploadModal(false);
      alert('Resume uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.response?.data?.detail || 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleStartInterview = () => {
    if (!resumeStatus || !resumeStatus.hasResume) {
      setShowUploadModal(true);
    } else {
      navigate('/interview');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[72px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back!
              </h1>
              <p className="text-white/60 text-lg">
                Here's your AI interview preparation dashboard.
              </p>
            </div>

            {/* Stats Grid - First Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Resume Status Card */}
              <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)] hover:border-[rgba(0,217,255,0.3)] transition-all">
                <p className="text-white/60 text-sm mb-4">Resume Status:</p>
                <div className="flex flex-col items-center">
                  {resumeStatus?.hasResume ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                        <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-white font-semibold text-center">Resume Uploaded</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-gray-500/20 flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-white/60 text-center">No Resume</p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => navigate('/dashboard/resume')}
                  className="w-full mt-4 px-4 py-2 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition text-sm font-medium"
                >
                  Manage
                </button>
              </div>

              {/* Total Interviews */}
              <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)] hover:border-[rgba(0,217,255,0.3)] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/60 text-sm">Total Interviews:</p>
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <p className="text-5xl font-bold text-cyan-400">{stats.totalInterviews}</p>
              </div>

              {/* Average Score */}
              <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)] hover:border-[rgba(0,217,255,0.3)] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/60 text-sm">Average Score:</p>
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-5xl font-bold text-purple-400">
                  {stats.totalInterviews > 0 ? `${stats.averageScore}%` : '--'}
                </p>
              </div>

              {/* Jobs Available */}
              <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)] hover:border-[rgba(0,217,255,0.3)] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/60 text-sm">Jobs Available:</p>
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-5xl font-bold text-cyan-400">40</p>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Start New Interview Button */}
              <button
                onClick={handleStartInterview}
                className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white rounded-2xl p-5 shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 transition-all group flex items-center justify-between"
              >
                <span className="text-lg font-bold">Start New Interview</span>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* View History Button */}
              <button
                onClick={() => navigate('/dashboard/history')}
                className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-5 border border-[rgba(0,217,255,0.15)] hover:border-purple-500/50 transition-all group flex items-center justify-between"
              >
                <span className="text-lg font-bold text-white">View History</span>
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Recommended Jobs */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Recommended Jobs</h2>
                <button
                  onClick={() => navigate('/dashboard/jobs')}
                  className="px-4 py-2 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition text-sm font-medium"
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/50">Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/50">No jobs available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {jobs.slice(0, 4).map((job) => (
                    <div 
                      key={job.jobId} 
                      className="bg-[#0d0b1a]/50 rounded-xl p-4 border border-[rgba(0,217,255,0.1)] hover:border-cyan-500/30 transition cursor-pointer group"
                      onClick={() => navigate(`/dashboard/jobs/${job.jobId}`)}
                    >
                      <h3 className="text-white font-semibold mb-1 group-hover:text-cyan-400 transition truncate">
                        {job.title}
                      </h3>
                      <p className="text-white/50 text-sm truncate">{job.company}, {job.location}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1633] rounded-2xl shadow-2xl max-w-md w-full p-8 border border-[rgba(0,217,255,0.2)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {resumeStatus?.hasResume ? 'Update Resume' : 'Upload Resume'}
              </h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                className="text-white/50 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-2 border-dashed border-cyan-500/30 rounded-xl p-8 text-center hover:border-cyan-500/50 transition bg-[#0d0b1a]/50">
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
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-white mb-2">
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-white/50">PDF only (Max 10MB)</p>
              </label>
            </div>

            {uploadError && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{uploadError}</p>
              </div>
            )}

            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-[#0d0b1a] rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-600 to-cyan-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
                <p className="text-sm text-white/50 text-center mt-2">Processing your resume...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
