import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';

const JobApplicationSuccess = ({ userEmail, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const job = location.state?.job;

  if (!job) {
    navigate('/dashboard/jobs');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[72px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Success Message */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-12 border border-[rgba(0,217,255,0.15)] text-center mb-6">
              {/* Success Icon */}
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
                🎉 Congratulations!
              </h1>
              <p className="text-2xl text-white font-semibold mb-2">
                Application Submitted Successfully
              </p>
              <p className="text-white/60 text-lg">
                Your application has been sent to the employer
              </p>
            </div>

            {/* Job Details */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)] mb-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Applied Position
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{job.title}</h3>
                  <p className="text-xl text-white/70 font-medium mt-1">{job.company}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-white/60 pt-4 border-t border-white/10">
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

                {job.skills && job.skills.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm font-semibold text-white/70 mb-3">Required Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interview Preparation CTA */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-900/30 p-8 text-white">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">Prepare for Your Interview!</h3>
                  <p className="text-white/80 mb-6">
                    Increase your chances of success by practicing with our AI-powered mock interview tailored to this position.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => navigate('/upload')}
                      className="px-8 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg"
                    >
                      Start Mock Interview
                    </button>
                    <button
                      onClick={() => navigate('/dashboard/jobs')}
                      className="px-8 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition border border-white/30"
                    >
                      Browse More Jobs
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)] mt-6">
              <h3 className="text-xl font-bold text-white mb-4">What Happens Next?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-purple-400 font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Application Review</p>
                    <p className="text-white/60 text-sm">The employer will review your application and resume</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-cyan-400 font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Interview Invitation</p>
                    <p className="text-white/60 text-sm">If selected, you'll receive an interview invitation via email</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-400 font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Prepare & Succeed</p>
                    <p className="text-white/60 text-sm">Use our mock interviews to prepare and ace your interview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default JobApplicationSuccess;
