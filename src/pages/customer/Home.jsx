import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { getDocsCachedFirst } from "../../lib/firestoreFetch";
import { Trophy, Users, Calendar, Zap, ChevronRight, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MODE_COLORS, isTournamentVisibleToUsers } from "../../lib/tournamentModes";

export default function Home() {
    const { user } = useAuth();
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const q = query(collection(db, "tournaments"), where("status", "in", ["upcoming", "ongoing"]), orderBy("createdAt", "desc"), limit(4));
                const snap = await getDocsCachedFirst(q);
                setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isTournamentVisibleToUsers));
            } catch { setTournaments([]); }
            setLoading(false);
        })();
    }, []);

    return (
        <div className="min-h-screen court-grid">
            {/* Hero */}
            <section className="hero-bg pt-28 pb-20 px-4">
                <div className="max-w-6xl mx-auto text-center animate-fade-in">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-amber-400 text-sm font-medium">Season 2025 — Registrations Open</span>
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

            {/* Open Tournaments */}
            <section className="py-20 px-4 bg-slate-900/40">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-end justify-between mb-10">
                        <div>
                            <h2 className="font-display text-4xl tracking-wider text-white">OPEN <span className="gradient-gold">TOURNAMENTS</span></h2>
                            <p className="text-slate-500 mt-1">Register before slots fill up</p>
                        </div>
                        <Link to="/tournaments" className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1">
                            View All <ChevronRight size={16} />
                        </Link>
                    </div>
                    {loading ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {[1, 2, 3, 4].map(i => <div key={i} className="card h-52 shimmer" />)}
                        </div>
                    ) : tournaments.length === 0 ? (
                        <div className="card p-12 text-center">
                            <Trophy size={40} className="text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400">No active tournaments yet. Check back soon!</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {tournaments.map(t => (
                                <div key={t.id} className="card p-5 hover:border-amber-500/30 transition-all hover:-translate-y-1 duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`text-xs px-2.5 py-1 rounded-full border ${t.status === "ongoing" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-amber-500/20 text-amber-400 border-amber-500/20"}`}>
                                            {t.status === "ongoing" ? "Live" : "Upcoming"}
                                        </span>
                                        <span className="text-slate-500 text-xs">{t.date}</span>
                                    </div>
                                    <h3 className="text-white font-semibold mb-2 leading-tight">{t.name}</h3>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {(t.modes || []).map(m => (
                                            <span key={m} className={`text-xs px-2 py-0.5 rounded-full border ${MODE_COLORS[m] || "bg-slate-700 text-slate-400 border-slate-600"}`}>{m}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between text-sm mb-4">
                                        <span className="text-slate-500 flex items-center gap-1"><Users size={12} /> {t.registrations || 0} registered</span>
                                    </div>
                                    <Link to={`/tournaments/${t.id}`} className="btn-gold w-full text-sm py-2 text-center block">
                                        View & Register
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
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