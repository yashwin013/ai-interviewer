import React from "react";

const Header = ({ userEmail, onLogout }) => {
    return (
        <div className="font-sans">
            <header className="bg-[#2a164b] text-white">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-5">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <h1 className="text-3xl font-extrabold tracking-wider">AI INTERVIEW</h1>
                        </div>

                        {/* Search Bar */}
                        <div className="flex-grow max-w-3xl w-full">
                            <div className="flex bg-white rounded-lg overflow-hidden h-12">
                                <input
                                    type="text"
                                    placeholder="Search jobs, keywords, companies"
                                    className="flex-1 px-4 text-gray-900 placeholder-gray-500 focus:outline-none border-r border-gray-200"
                                />
                                <input
                                    type="text"
                                    placeholder='Enter location or "remote"'
                                    className="flex-1 px-4 text-gray-900 placeholder-gray-500 focus:outline-none hidden sm:block"
                                />
                                <button className="bg-[#6c757d] hover:bg-gray-600 w-12 flex items-center justify-center transition-colors">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                            {userEmail ? (
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-white/90">{userEmail}</span>
                                    {onLogout && (
                                        <button
                                            onClick={onLogout}
                                            className="px-5 py-2 border border-white rounded-md font-bold text-white hover:bg-white/10 transition"
                                        >
                                            Logout
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <a href="#" className="px-6 py-2 bg-[#a342a3] hover:bg-[#913b91] rounded-md font-bold text-white transition">
                                        Sign up
                                    </a>
                                    <a href="#" className="px-6 py-2 border border-white rounded-md font-bold text-white hover:bg-white/10 transition">
                                        Log in
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Secondary Navigation */}
                    <nav className="mt-6 flex flex-wrap items-center justify-between border-t border-white/10 pt-4">
                        <div className="flex gap-8 overflow-x-auto pb-2 lg:pb-0">
                            <a href="#" className="text-white hover:text-gray-200 font-medium whitespace-nowrap">Find Jobs</a>
                            <a href="#" className="text-white hover:text-gray-200 font-medium whitespace-nowrap">Salary Tools</a>
                            <a href="#" className="text-white hover:text-gray-200 font-medium whitespace-nowrap">Career Advice</a>
                            <a href="#" className="text-white hover:text-gray-200 font-medium whitespace-nowrap">Upload Resume</a>
                        </div>
                        <a href="#" className="hidden lg:flex items-center gap-2 text-white hover:text-gray-200 font-medium">
                            Employers / Post Job
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </a>
                    </nav>
                </div>
            </header>
        </div>
    );
};

export default Header;
