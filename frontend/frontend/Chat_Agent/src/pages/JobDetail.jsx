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
      <div className="min-h-screen bg-[#0d0b1a]">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex pt-[72px]">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/50">Loading job details...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#0d0b1a]">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex pt-[72px]">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)] text-center">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Job Not Found</h2>
                <p className="text-white/60 mb-6">{error || 'The job you are looking for does not exist.'}</p>
                <button
                  onClick={() => navigate('/dashboard/jobs')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-cyan-500 transition shadow-lg"
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
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[72px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="mb-6 flex items-center gap-2 text-white/60 hover:text-cyan-400 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Job Header */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)] mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">{job.title}</h1>
                  <p className="text-xl text-white/70 font-medium mb-4">{job.company}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-white/50">
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
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-cyan-500 transition shadow-lg"
                >
                  Apply Now
                </button>
              </div>

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="border-t border-[rgba(0,217,255,0.1)] pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, idx) => (
                      <span key={idx} className="px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium border border-cyan-500/20">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)] mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">Job Description</h2>
              <div className="prose max-w-none text-white/70 leading-relaxed">
                {job.description ? (
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: job.description
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                        .replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>')
                        .replace(/\n\n/g, '<br/><br/>')
                    }}
                  />
                ) : (
                  <p className="text-white/40 italic">No description available for this position.</p>
                )}
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
              <h2 className="text-2xl font-bold text-white mb-6">Additional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {job.salary_range && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/50 mb-2">Salary Range</h3>
                    <p className="text-lg text-white">{job.salary_range}</p>
                  </div>
                )}
                {job.posted_date && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/50 mb-2">Posted Date</h3>
                    <p className="text-lg text-white">{new Date(job.posted_date).toLocaleDateString()}</p>
                  </div>
                )}
                {job.application_deadline && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/50 mb-2">Application Deadline</h3>
                    <p className="text-lg text-white">{new Date(job.application_deadline).toLocaleDateString()}</p>
                  </div>
                )}
                {job.company_size && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/50 mb-2">Company Size</h3>
                    <p className="text-lg text-white">{job.company_size}</p>
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
