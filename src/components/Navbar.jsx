import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X, Trophy, LogOut, User, BookOpen, Shield, ChevronDown } from "lucide-react";

export default function Navbar() {
    const { user, userProfile, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [dropOpen, setDropOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/");
        setOpen(false);
        setDropOpen(false);
    };

    const isActive = (p) => location.pathname === p;

    const customerLinks = [
        { to: "/", label: "Home" },
        { to: "/tournaments", label: "Tournaments" },
        { to: "/my-registrations", label: "My Registrations" },
    ];

    const adminLinks = [
        { to: "/admin", label: "Dashboard" },
        { to: "/admin/tournaments", label: "Tournaments" },
        { to: "/admin/registrations", label: "Registrations" },
        { to: "/admin/players", label: "Players" },
    ];

    const links = isAdmin ? adminLinks : customerLinks;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to={isAdmin ? "/admin" : "/"} className="flex items-center gap-2.5 group hover:scale-105 transition-transform duration-300">
                        <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover:bg-amber-400 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all duration-300">
                            <Trophy size={18} className="text-slate-950" />
                        </div>
                        <span className="font-display text-xl tracking-widest">
                            <span className="text-white">PALM DINK & </span><span className="gradient-gold">SMASH COURT</span>
                        </span>
                        {isAdmin && (
                            <span className="hidden sm:flex items-center gap-1 bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                                <Shield size={10} /> Admin
                            </span>
                        )}
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {links.map(({ to, label }) => (
                            <Link key={to} to={to}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isActive(to) ? "text-amber-400 bg-amber-500/10 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]" : "text-slate-400 hover:text-white hover:bg-slate-800/80 hover:shadow-md"}`}>
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <div className="relative">
                                <button onClick={() => setDropOpen(!dropOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isAdmin ? "bg-amber-500/20 border border-amber-500/30 text-amber-400" : "bg-slate-700 text-white"}`}>
                                        {isAdmin ? <Shield size={14} /> : (userProfile?.fullName?.[0] || "U").toUpperCase()}
                                    </div>
                                    <span className="text-slate-300 text-sm hidden sm:block">
                                        {isAdmin ? "Admin" : (userProfile?.fullName?.split(" ")[0] || "Player")}
                                    </span>
                                    <ChevronDown size={14} className="text-slate-500 hidden sm:block" />
                                </button>
                                {dropOpen && (
                                    <div className="absolute right-0 top-12 w-48 card shadow-2xl py-2 z-50 animate-slide-up border border-slate-700/50">
                                        {!isAdmin && (
                                            <>
                                                <Link to="/profile" onClick={() => setDropOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors">
                                                    <User size={14} /> My Profile
                                                </Link>
                                                <Link to="/my-registrations" onClick={() => setDropOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors">
                                                    <BookOpen size={14} /> Registrations
                                                </Link>
                                                <div className="border-t border-slate-800 mt-1 pt-1" />
                                            </>
                                        )}
                                        <button onClick={handleLogout}
                                            className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 text-sm w-full transition-colors">
                                            <LogOut size={14} /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium px-4 py-2 hidden sm:block transition-colors">
                                    Sign In
                                </Link>
                                <Link to="/register" className="btn-gold text-sm py-2 px-4">Join Now</Link>
                            </div>
                        )}
                        <button onClick={() => setOpen(!open)}
                            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                            {open ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {open && (
                    <div className="md:hidden py-3 border-t border-slate-800/50 animate-slide-up bg-space-900/95 absolute left-0 right-0 px-4 shadow-xl">
                        {links.map(({ to, label }) => (
                            <Link key={to} to={to} onClick={() => setOpen(false)}
                                className={`flex items-center px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-colors ${isActive(to) ? "text-amber-400 bg-amber-500/10" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                                {label}
                            </Link>
                        ))}
                        {!isAdmin && user && (
                            <Link to="/profile" onClick={() => setOpen(false)}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl mb-1 text-sm text-slate-400 hover:text-white hover:bg-slate-800">
                                <User size={14} /> My Profile
                            </Link>
                        )}
                        {user ? (
                            <button onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 w-full mt-1">
                                <LogOut size={14} /> Sign Out
                            </button>
                        ) : (
                            <Link to="/login" onClick={() => setOpen(false)}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl mb-1 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                                <User size={14} /> Sign In
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}