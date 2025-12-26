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

      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr);

      await uploadResume(user.userId, file);
      
      // Refresh resume status
      await fetchResumeStatus();
      
      // Close modal
      setShowUploadModal(false);
      
      // Show success message
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
      // Navigate to interview type selection or directly to interview
      navigate('/interview');
    }
  };

  // Helper functions for match display
  const getMatchPercentage = (job) => {
    if (job.match_score !== undefined) {
      return `${job.match_score}%`;
    }
    return 'New';
  };

  const getMatchColor = (job) => {
    const score = job.match_score || 0;
    if (score >= 75) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-blue-100 text-blue-700';
    if (score >= 25) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[138px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Welcome back!
              </h1>
              <p className="text-gray-600 text-lg">
                Here's your interview preparation dashboard
              </p>
            </div>

            {/* Resume Status Card - Compact */}
            <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-lg p-4 border border-white/50 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    resumeStatus?.hasResume 
                      ? 'bg-green-100' 
                      : 'bg-gray-100'
                  }`}>
                    <svg className={`w-5 h-5 ${resumeStatus?.hasResume ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {resumeStatus?.hasResume ? '✓ Resume Uploaded' : 'Resume'}
                    </p>
                    {resumeStatus?.hasResume && (
                      <p className="text-xs text-gray-500">
                        Ready for interviews
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard/resume')}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
                >
                  {resumeStatus?.hasResume ? 'Manage' : 'Upload'}
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Interviews */}
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total Interviews</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalInterviews}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Average Score */}
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Average Score</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {stats.totalInterviews > 0 ? `${stats.averageScore}%` : '--'}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Jobs Available */}
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Jobs Available</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">40</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <button
                onClick={handleStartInterview}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-xl font-bold mb-2">Start New Interview</h3>
                    <p className="text-purple-100">
                      {resumeStatus?.hasResume 
                        ? 'Begin your practice session' 
                        : 'Upload resume to get started'}
                    </p>
                  </div>
                  <svg className="w-8 h-8 group-hover:translate-x-2 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => navigate('/dashboard/history')}
                className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-xl hover:shadow-2xl transition border border-gray-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">View History</h3>
                    <p className="text-gray-600">Review your past interviews</p>
                  </div>
                  <svg className="w-8 h-8 text-gray-400 group-hover:translate-x-2 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Recommended Jobs */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Recommended Jobs</h2>
                <button
                  onClick={() => navigate('/dashboard/jobs')}
                  className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-1"
                >
                  View All
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No jobs available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job, index) => (
                    <div 
                      key={job.jobId} 
                      className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 hover:shadow-lg transition cursor-pointer group"
                      onClick={() => navigate(`/dashboard/jobs/${job.jobId}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-600 transition mb-1">
                            {job.title}
                          </h3>
                          <p className="text-gray-600 font-medium">{job.company}</p>
                        </div>
                        <div className="ml-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getMatchColor(job)}`}>
                            {getMatchPercentage(job)} Match
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {job.location}
                          </span>
                        )}
                        {job.job_type && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {job.job_type}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {job.skills && job.skills.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {resumeStatus?.hasResume ? 'Update Resume' : 'Upload Resume'}
              </h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition">
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
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-800 mb-2">
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500">PDF only (Max 10MB)</p>
              </label>
            </div>

            {uploadError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{uploadError}</p>
              </div>
            )}

            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">Processing your resume...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
