import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../firebase";
import { collection } from "firebase/firestore";
import { getDocsCachedFirst } from "../../lib/firestoreFetch";
import { Trophy, Users, ChevronRight, TrendingUp, Award, Plus } from "lucide-react";

export default function AdminDashboard() {
    const [stats, setStats] = useState({ tournaments: 0, registrations: 0, players: 0, ongoing: 0 });
    const [recentT, setRecentT] = useState([]);
    const [recentR, setRecentR] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [tSnap, rSnap, pSnap] = await Promise.all([
                    getDocsCachedFirst(collection(db, "tournaments")),
                    getDocsCachedFirst(collection(db, "registrations")),
                    getDocsCachedFirst(collection(db, "players")),
                ]);
                const ongoing = tSnap.docs.filter(d => d.data().status === "ongoing").length;
                setStats({ tournaments: tSnap.size, registrations: rSnap.size, players: pSnap.size, ongoing });

                setRecentT(tSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5));
                setRecentR(rSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 6));
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    const statCards = [
        { label: "Total Tournaments", value: stats.tournaments, icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
        { label: "Total Registrations", value: stats.registrations, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Registered Players", value: stats.players, icon: Award, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { label: "Live Now", value: stats.ongoing, icon: TrendingUp, color: "text-red-400", bg: "bg-red-500/10" },
    ];

    return (
        <div className="min-h-screen court-grid pt-20 pb-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="pt-6 mb-8 flex items-end justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="font-display text-4xl tracking-wider text-white">
                            ADMIN <span className="gradient-gold">DASHBOARD</span>
                        </h1>
                        <p className="text-slate-500 mt-1">Palm Dink & Smash Court Tournament Management</p>
                    </div>
                    <Link to="/admin/tournaments" className="btn-gold flex items-center gap-2">
                        <Plus size={16} /> New Tournament
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="card p-5">
                            <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                                <Icon size={20} className={color} />
                            </div>
                            <div className="font-display text-3xl text-white tracking-wider">
                                {loading ? <div className="h-8 w-12 shimmer rounded" /> : value}
                            </div>
                            <div className="text-slate-500 text-sm mt-1">{label}</div>
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-5 gap-6">
                    {/* Recent Tournaments */}
                    <div className="lg:col-span-3 card p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Trophy size={16} className="text-amber-400" /> Recent Tournaments
                            </h3>
                            <Link to="/admin/tournaments" className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">
                                View All <ChevronRight size={13} />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 shimmer rounded-xl" />)}</div>
                        ) : recentT.length === 0 ? (
                            <div className="text-center py-8">
                                <Trophy size={28} className="text-slate-700 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No tournaments yet</p>
                                <Link to="/admin/tournaments" className="text-amber-400 text-xs mt-1 block">Create your first →</Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentT.map(t => (
                                    <Link key={t.id} to={`/admin/tournaments/${t.id}`}
                                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                                                <Trophy size={14} className="text-amber-400" />
                                            </div>
                                            <div>
                                                <div className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors">{t.name}</div>
                                                <div className="text-slate-500 text-xs">{(t.modes || []).join(", ")} · {t.registrations || 0} registered</div>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "ongoing" ? "bg-emerald-500/20 text-emerald-400"
                                                : t.status === "completed" ? "bg-slate-700 text-slate-400"
                                                    : "bg-amber-500/20 text-amber-400"}`}>
                                            {t.status}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Registrations */}
                    <div className="lg:col-span-2 card p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Users size={16} className="text-amber-400" /> Recent Sign-ups
                            </h3>
                            <Link to="/admin/registrations" className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">
                                View All <ChevronRight size={13} />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-12 shimmer rounded-xl" />)}</div>
                        ) : recentR.length === 0 ? (
                            <div className="text-center py-8">
                                <Users size={28} className="text-slate-700 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No registrations yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentR.map(r => (
                                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                                        <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                                            {(r.playerName?.[0] || "?").toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-white text-sm font-medium truncate">{r.playerName}</div>
                                            <div className="text-slate-500 text-xs truncate">{r.tournamentName} · {r.mode}</div>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${r.status === "confirmed" ? "bg-emerald-500/20 text-emerald-400"
                                                : r.status === "rejected" ? "bg-red-500/20 text-red-400"
                                                    : "bg-amber-500/20 text-amber-400"}`}>
                                            {r.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid sm:grid-cols-3 gap-4 mt-6">
                    {[
                        { to: "/admin/tournaments", icon: Trophy, label: "Create Tournament", desc: "Set up a new competition" },
                        { to: "/admin/registrations", icon: Users, label: "Review Registrations", desc: "Approve or reject players" },
                        { to: "/admin/players", icon: Award, label: "Manage Players", desc: "Manage player directory" },
                    ].map(({ to, icon: Icon, label, desc }) => (
                        <Link key={label} to={to}
                            className="card p-5 hover:border-amber-500/30 transition-all hover:-translate-y-0.5 group">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-500/20 transition-colors">
                                <Icon size={18} className="text-amber-400" />
                            </div>
                            <div className="text-white font-medium text-sm">{label}</div>
                            <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}