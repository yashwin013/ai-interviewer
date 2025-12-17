import React from "react";
import { Link } from "react-router-dom";

const Header = ({ userEmail, onLogout }) => {
    return (
        <div className="font-sans">
            <header className="bg-[#2a164b] text-white fixed top-0 left-0 right-0 z-50">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-5">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link to="/dashboard" className="flex-shrink-0">
                            <h1 className="text-3xl font-extrabold tracking-wider hover:text-purple-300 transition">EchoPrep</h1>
                        </Link>

                        {/* Auth Section */}
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
                </div>
            </header>
        </div>
    );
};

export default Header;
