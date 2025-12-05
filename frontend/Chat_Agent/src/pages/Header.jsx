import React from "react";

const Header = ({ userEmail, onLogout }) => {
    return (
        <div>
            <header className="w-full bg-white shadow-sm fixed top-0 left-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
                    <nav className="hidden md:flex items-center gap-8 text-gray-700 font-medium navbar_min">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-200"></div>
                            <h1 className="text-xl font-semibold text-gray-900"> AI Interview Studio</h1>
                        </div>
                        <div className="list">
                            <a href="#" className="hover:text-black transition">Summery</a>
                            <a href="#" className="hover:text-black transition">Features</a>
                            <a href="#" className="hover:text-black transition">About</a>
                        </div>
                    </nav>
                    <div className="flex items-center gap-8">
                        {userEmail && (
                            <p className="hidden lg:block text-gray-600">
                                Signed in as <span className="font-semibold">{userEmail}</span>
                            </p>
                        )}
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="hidden lg:block px-5 py-2 border border-gray-300 rounded-full text-gray-800 font-medium hover:bg-gray-100 transition"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <style>
                {'.navbar_min{display:flex; justify-content:space-between; align-items:center;}.list{display:flex; gap:30px;}'}
            </style>
        </div>
    );
};

export default Header;
