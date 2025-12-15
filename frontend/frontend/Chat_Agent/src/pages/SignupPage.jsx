import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signupRequest } from "../redux/auth/signupSlice";

const SignupPage = ({ onSignup }) => {
    const dispatch = useDispatch();
    const { loading, success, error: apiError } = useSelector((state) => state.signup);
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const validate = () => {
        if (!form.name.trim()) return "Name is required";
        if (!form.email.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            return "Enter a valid email address";
        if (!form.password.trim()) return "Password is required";
        if (form.password.length < 6)
            return "Password must be at least 6 characters";
        return "";
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const msg = validate();
        if (msg) return setError(msg);

        setError("");

        dispatch(signupRequest(form));
    };

    useEffect(() => {
        if (success) {
            navigate("/");
        }
    }, [success, navigate]);

    useEffect(() => {
        if (apiError) {
            setError(apiError);
        }
    }, [apiError]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] px-4 font-sans relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-[#2a164b] z-0"></div>
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#00c0b3] rounded-full blur-[120px] opacity-20 pointer-events-none z-0"></div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-[#2a164b] tracking-wide mb-2">AI INTERVIEW</h1>
                    <h2 className="text-xl font-semibold text-gray-700">Create Account</h2>                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                name="name"
                                placeholder="John Doe"
                                value={form.name}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0b3]/50 focus:border-[#00c0b3] transition bg-gray-50 focus:bg-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            </div>
                            <input
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0b3]/50 focus:border-[#00c0b3] transition bg-gray-50 focus:bg-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <input
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c0b3]/50 focus:border-[#00c0b3] transition bg-gray-50 focus:bg-white"
                            />
                        </div>
                    </div>
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#6e46ae] text-white py-3 rounded-lg font-bold text-lg hover:bg-[#00a093] transition shadow-md hover:shadow-lg disabled:opacity-50 transform active:scale-98"
                    >
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600 text-sm">
                        Already have an account?
                        <button
                            className="ml-2 text-[#6e46ae] font-semibold hover:underline"
                            onClick={() => navigate("/login")}
                        >
                            Log In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;

