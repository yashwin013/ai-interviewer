import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';
import { getAllJobs, searchJobs } from '../services/apiService';

const JobBoard = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchJobs();
  }, [page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await getAllJobs({ page, limit: 20 });
      setJobs(response.jobs);
      setTotalPages(response.totalPages);
      setTotal(response.total);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[138px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Job Board
              </h1>
              <p className="text-gray-600 text-lg">
                Explore {total.toLocaleString()}+ job opportunities
              </p>
            </div>

            {/* Search Bar */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
              <form onSubmit={handleSearch} className="flex gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jobs by title or company..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Jobs List */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-semibold">No jobs found</p>
                  <p className="text-gray-400 text-sm mt-2">Try adjusting your search</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {jobs.map((job) => (
                      <div 
                        key={job.jobId} 
                        onClick={() => navigate(`/dashboard/jobs/${job.jobId}`)}
                        className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 hover:shadow-lg transition cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition mb-1">
                              {job.title}
                            </h3>
                            <p className="text-gray-600 font-medium text-lg">{job.company}</p>
                          </div>
                          <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
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
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {job.skills && job.skills.slice(0, 5).map((skill, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                              {skill}
                            </span>
                          ))}
                          {job.skills && job.skills.length > 5 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                              +{job.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <p className="text-gray-600">
                      Showing {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} of {total.toLocaleString()} jobs
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold">
                        {page}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
