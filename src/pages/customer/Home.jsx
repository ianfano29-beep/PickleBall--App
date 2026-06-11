import { Link } from "react-router-dom";
import { Trophy, Users, Calendar, Zap, ChevronRight, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Home() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen court-grid">
            {/* Hero */}
            <section className="hero-bg pt-28 pb-20 px-4">
                <div className="max-w-6xl mx-auto text-center animate-fade-in">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-amber-400 text-sm font-medium">Season 2026 — Registrations Open</span>
                    </div>
                    <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-widest text-white leading-tight mb-6 drop-shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-slide-up">
                        PALM DINK & <span className="gradient-gold">SMASH COURT</span>
                    </h1>
                    <p className="text-slate-400 text-lg sm:text-xl mb-8 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                        Compete in the most exciting pickleball tournaments. Register for your division, climb the bracket, and claim the championship.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/tournaments" className="btn-gold text-base px-8 py-4 flex items-center justify-center gap-2">
                            <Trophy size={18} /> Browse Tournaments
                        </Link>
                        {!user && (
                            <Link to="/register" className="btn-dark text-base px-8 py-4 flex items-center justify-center gap-2">
                                Create Account <ChevronRight size={18} />
                            </Link>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                        {[{ val: "12+", label: "Tournaments" }, { val: "480+", label: "Players" }, { val: "4", label: "Divisions" }, { val: "₱50K", label: "Prize Pool" }].map(s => (
                            <div key={s.label} className="card p-4 text-center hover:scale-105 transition-transform duration-300 bg-slate-900/40 border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                                <div className="font-display text-3xl gradient-gold tracking-wider drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">{s.val}</div>
                                <div className="text-slate-500 text-sm mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="font-display text-4xl tracking-wider text-center text-white mb-2">HOW IT <span className="gradient-gold">WORKS</span></h2>
                    <p className="text-slate-500 text-center mb-12">From sign-up to champion in 4 easy steps</p>
                    <div className="grid sm:grid-cols-4 gap-6">
                        {[
                            { step: "01", icon: Users, title: "Create Account", desc: "Register as a player with your name, age, and contact info." },
                            { step: "02", icon: Trophy, title: "Choose Tournament", desc: "Browse open tournaments and pick your mode — Singles, Doubles, and more." },
                            { step: "03", icon: Calendar, title: "Register", desc: "Submit your registration and wait for admin confirmation." },
                            { step: "04", icon: Zap, title: "Compete!", desc: "Check the live bracket, play matches, and track scores in real time." },
                        ].map(({ step, icon: Icon, title, desc }) => (
                            <div key={step} className="card p-6 relative overflow-hidden group hover:border-amber-500/30 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-all duration-300 hover:-translate-y-2">
                                <div className="absolute top-4 right-4 font-display text-5xl text-slate-800 group-hover:text-amber-500/10 transition-colors duration-300">{step}</div>
                                <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                    <Icon size={20} className="text-amber-400" />
                                </div>
                                <h3 className="text-white font-semibold mb-2 group-hover:text-amber-300 transition-colors">{title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>



            {/* Admin Entry */}
            <section className="py-16 px-4">
                <div className="max-w-md mx-auto">
                    <Link to="/admin-login" className="card p-5 flex items-center gap-4 hover:border-amber-500/30 transition-colors group">
                        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                            <Shield size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">Tournament Admin Panel</h3>
                            <p className="text-slate-500 text-xs">Manage tournaments, brackets &amp; scores</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-600 group-hover:text-amber-400 transition-colors ml-auto" />
                    </Link>
                </div>
            </section>

            <footer className="border-t border-slate-800 py-8 px-4 text-center text-slate-600 text-sm">
                © 2025 Palm Dink & Smash Court Tournament System. All rights reserved.
            </footer>
        </div>
    );
}