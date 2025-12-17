import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';
import { getUserResults } from '../services/apiService';

const InterviewHistory = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user || !user.userId) {
        setError('User not found. Please login again.');
        return;
      }

      const results = await getUserResults(user.userId);
      setInterviews(results);
    } catch (err) {
      console.error('Failed to fetch interviews:', err);
      setError('Failed to load interview history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[138px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Interview History
              </h1>
              <p className="text-gray-600 text-lg">
                Review your past interviews and track your progress
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
              <div className="flex items-center gap-4">
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                >
                  <option value="all">All Interviews</option>
                  <option value="practice">Practice</option>
                  <option value="job">Job Applications</option>
                </select>
                <select 
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                >
                  <option value="all">All time</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 3 months</option>
                  <option value="180">Last 6 months</option>
                </select>
              </div>
            </div>

            {/* Interview List */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading interviews...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-red-600 font-semibold">{error}</p>
                  <button
                    onClick={fetchInterviews}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
                  >
                    Retry
                  </button>
                </div>
              ) : interviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-semibold">No interviews yet</p>
                  <p className="text-gray-400 text-sm mt-2">Complete your first interview to see it here</p>
                  <button
                    onClick={() => navigate('/upload')}
                    className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
                  >
                    Start Interview
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div 
                      key={interview.resultId} 
                      className="p-6 border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-lg transition group cursor-pointer"
                      onClick={() => navigate(`/results/${interview.sessionId}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition">
                              Mock Interview
                            </h3>
                            <span className={`px-4 py-1 rounded-full text-sm font-semibold ${getScoreColor(interview.assessment?.candidate_score_percent || 0)}`}>
                              {interview.assessment?.candidate_score_percent || 0}%
                            </span>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3">
                            {formatDate(interview.createdAt)}
                          </p>

                          {interview.assessment?.summary && (
                            <p className="text-gray-700 mb-4 line-clamp-2">
                              {interview.assessment.summary}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {interview.assessment?.strengths?.slice(0, 3).map((strength, idx) => (
                              <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm">
                                ✓ {strength}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="ml-4">
                          <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InterviewHistory;

