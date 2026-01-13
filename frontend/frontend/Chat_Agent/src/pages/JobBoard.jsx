import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';
import { getAllJobs, searchJobs, getMatchedJobs } from '../services/apiService';

const JobBoard = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMatchData, setHasMatchData] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      
      // Try to get matched jobs if user is logged in
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.userId) {
            const response = await getMatchedJobs(user.userId, { page, limit: 20 });
            setJobs(response.jobs);
            setTotalPages(response.totalPages);
            setTotal(response.total);
            setHasMatchData(response.jobs.length > 0 && response.jobs[0].has_match_data);
            return;
          }
        } catch (err) {
          console.warn('Failed to get matched jobs, falling back to all jobs:', err);
        }
      }
      
      // Fallback to regular job listing
      const response = await getAllJobs({ page, limit: 20 });
      setJobs(response.jobs);
      setTotalPages(response.totalPages);
      setTotal(response.total);
      setHasMatchData(false);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchJobs();
      return;
    }

    try {
      setLoading(true);
      const response = await searchJobs(searchQuery, page, 20);
      setJobs(response.jobs);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[72px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Job Board
              </h1>
              <p className="text-white/60 text-lg">
                Explore {total.toLocaleString()}+ job opportunities
              </p>
            </div>

            {/* Search Bar */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-[rgba(0,217,255,0.15)]">
              <form onSubmit={handleSearch} className="flex gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jobs by title or company..."
                  className="flex-1 px-4 py-3 bg-[#0d0b1a]/50 border border-[rgba(0,217,255,0.2)] rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition text-white placeholder-white/40"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-cyan-500 transition shadow-lg shadow-purple-900/30"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Jobs List */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/50">Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-[#0d0b1a] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-lg font-semibold">No jobs found</p>
                  <p className="text-white/30 text-sm mt-2">Try adjusting your search</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {jobs.map((job) => (
                      <div 
                        key={job.jobId} 
                        onClick={() => navigate(`/dashboard/jobs/${job.jobId}`)}
                        className="bg-[#0d0b1a]/50 border border-[rgba(0,217,255,0.1)] rounded-xl p-6 hover:border-cyan-500/30 transition cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition">
                                {job.title}
                              </h3>
                              {/* Match Percentage Badge */}
                              {job.has_match_data && job.match_percentage !== null && (
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  job.match_percentage >= 70 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : job.match_percentage >= 40 
                                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                  {job.match_percentage}% Match
                                </span>
                              )}
                            </div>
                            <p className="text-white/60 font-medium text-lg">{job.company}</p>
                          </div>
                          <svg className="w-6 h-6 text-white/30 group-hover:text-cyan-400 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
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
                          {job.experience_level && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              {job.experience_level}
                            </span>
                          )}
                          {/* Matched Skills Count */}
                          {job.has_match_data && job.matched_skills && job.matched_skills.length > 0 && (
                            <span className="flex items-center gap-1 text-green-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {job.matched_skills.length} skills matched
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {job.skills && job.skills.slice(0, 5).map((skill, idx) => {
                            const isMatched = job.matched_skills && job.matched_skills.includes(skill.toLowerCase());
                            return (
                              <span 
                                key={idx} 
                                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                                  isMatched 
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                }`}
                              >
                                {isMatched && '✓ '}{skill}
                              </span>
                            );
                          })}
                          {job.skills && job.skills.length > 5 && (
                            <span className="px-3 py-1 bg-white/5 text-white/50 rounded-lg text-xs font-medium">
                              +{job.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-6 border-t border-[rgba(0,217,255,0.1)]">
                    <p className="text-white/50">
                      Showing {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} of {total.toLocaleString()} jobs
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-[rgba(0,217,255,0.2)] text-white rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold">
                        {page}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border border-[rgba(0,217,255,0.2)] text-white rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default JobBoard;
