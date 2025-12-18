import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';
import { getJobById } from '../services/apiService';

const JobDetail = ({ userEmail, onLogout }) => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await getJobById(jobId);
      setJob(response);
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex pt-[138px]">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Loading job details...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex pt-[138px]">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Job Not Found</h2>
                <p className="text-gray-600 mb-6">{error || 'The job you are looking for does not exist.'}</p>
                <button
                  onClick={() => navigate('/dashboard/jobs')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
                >
                  Back to Job Board
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[138px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-purple-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Job Header */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{job.title}</h1>
                  <p className="text-xl text-gray-600 font-medium mb-4">{job.company}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    {job.location && (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                    )}
                    {job.job_type && (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.job_type}
                      </span>
                    )}
                    {job.experience_level && (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {job.experience_level}
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/dashboard/jobs/apply-success', { state: { job } })}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
                >
                  Apply Now
                </button>
              </div>

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, idx) => (
                      <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Description</h2>
              <div className="prose max-w-none text-gray-600">
                {job.description ? (
                  <p className="whitespace-pre-wrap">{job.description}</p>
                ) : (
                  <p className="text-gray-400 italic">No description available for this position.</p>
                )}
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Additional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {job.salary_range && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">Salary Range</h3>
                    <p className="text-lg text-gray-800">{job.salary_range}</p>
                  </div>
                )}
                {job.posted_date && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">Posted Date</h3>
                    <p className="text-lg text-gray-800">{new Date(job.posted_date).toLocaleDateString()}</p>
                  </div>
                )}
                {job.application_deadline && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">Application Deadline</h3>
                    <p className="text-lg text-gray-800">{new Date(job.application_deadline).toLocaleDateString()}</p>
                  </div>
                )}
                {job.company_size && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">Company Size</h3>
                    <p className="text-lg text-gray-800">{job.company_size}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default JobDetail;
