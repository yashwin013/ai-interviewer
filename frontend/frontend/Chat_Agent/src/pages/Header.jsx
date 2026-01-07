import React from "react";
import { Link } from "react-router-dom";

const Header = ({ userEmail, onLogout }) => {
    return (
        <header className="bg-[#0d0b1a] text-white fixed top-0 left-0 right-0 z-50 border-b border-[rgba(0,217,255,0.1)]">
            <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo with Microphone Icon */}
                    <Link to="/dashboard" className="flex items-center gap-3 flex-shrink-0 group">
                        {/* Microphone Icon */}
                        <div className="relative">
                            <svg className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                            </svg>
                            {/* Sound waves */}
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2">
                                <div className="flex gap-0.5">
                                    <div className="w-0.5 h-2 bg-cyan-400 rounded-full opacity-80"></div>
                                    <div className="w-0.5 h-3 bg-cyan-400 rounded-full opacity-60"></div>
                                    <div className="w-0.5 h-2 bg-cyan-400 rounded-full opacity-40"></div>
                                </div>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-wide">
                            <span className="text-purple-400">U-VA </span>
                            <span className="text-white"> Interview</span>
                        </h1>
                    </Link>

                    {/* Auth Section */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        {userEmail ? (
                            <div className="flex items-center gap-4">
                                {/* User Avatar & Email */}
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="text-white/80 text-sm font-medium hidden md:block">{userEmail}</span>
                                </div>
                                {onLogout && (
                                    <button
                                        onClick={onLogout}
                                        className="px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg font-semibold text-white hover:from-purple-500 hover:to-purple-600 transition-all shadow-lg shadow-purple-900/30"
                                    >
                                        Logout
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link 
                                    to="/SignupPage" 
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg font-semibold text-white hover:from-purple-500 hover:to-purple-600 transition-all"
                                >
                                    Sign up
                                </Link>
                                <Link 
                                    to="/" 
                                    className="px-6 py-2 border border-purple-500/50 rounded-lg font-semibold text-white hover:bg-purple-500/10 transition"
                                >
                                    Log in
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
