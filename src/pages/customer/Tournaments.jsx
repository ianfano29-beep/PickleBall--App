import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { getDocsCachedFirst } from "../../lib/firestoreFetch";
import { Trophy, Calendar, ChevronRight, Search, Clock, Shuffle } from "lucide-react";
import { MODE_COLORS, groupModesForDisplay, isTournamentVisibleToUsers, formatCallTime } from "../../lib/tournamentModes";

export default function Tournaments() {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        (async () => {
            try {
                const snap = await getDocsCachedFirst(query(collection(db, "tournaments"), orderBy("createdAt", "desc")));
                setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch { setTournaments([]); }
            setLoading(false);
        })();
    }, []);

    const filtered = tournaments.filter(t => {
        if (!isTournamentVisibleToUsers(t)) return false;
        const matchSearch = (t.name || "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || t.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div className="min-h-screen court-grid pt-20 pb-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center pt-6 mb-10 animate-fade-in">
                    <h1 className="font-display text-5xl tracking-widest text-white drop-shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-slide-up">ALL <span className="gradient-gold">TOURNAMENTS</span></h1>
                    <p className="text-slate-500 mt-2 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>Find and register for your next competition</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" className="input-field pl-10 bg-slate-900/90 focus:shadow-[0_0_15px_rgba(245,158,11,0.2)]" placeholder="Search tournaments..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {["all", "upcoming", "ongoing", "completed"].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all duration-300 ${statusFilter === s ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700/90"}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="card h-64 shimmer" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Trophy size={40} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No tournaments found</p>
                        <p className="text-slate-600 text-sm mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                        {filtered.map(t => (
                            <div key={t.id} className="card overflow-hidden hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_2px_10px_rgba(245,158,11,0.5)]" />
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        {t.status !== "completed" ? (
                                            <span className={`text-xs px-2.5 py-1 rounded-full border ${t.status === "ongoing" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                                    : "bg-amber-500/20 text-amber-400 border-amber-500/20"}`}>
                                                {t.status === "ongoing" ? "Live" : "Upcoming"}
                                            </span>
                                        ) : (
                                            <div />
                                        )}
                                        <span className="text-slate-500 text-xs flex items-center gap-1">
                                            <Calendar size={11} /> {t.date || "TBD"}
                                            {t.callTime && <><Clock size={10} /> {formatCallTime(t.callTime)}</>}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-semibold text-lg mb-1 leading-tight">{t.name}</h3>
                                    {t.description && <p className="text-slate-500 text-sm mb-2 line-clamp-2">{t.description}</p>}
                                    {t.announcement && <p className="text-amber-400/80 text-xs mb-2 line-clamp-1">{t.announcement}</p>}
                                    {t.blindPairing && (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-400 mb-2">
                                            <Shuffle size={10} /> Blind Pairing
                                        </span>
                                    )}
                                    <div className="space-y-2 mb-4">
                                        {groupModesForDisplay(t.modes).map(group => (
                                            <div key={group.label}>
                                                <div className="text-[10px] text-slate-600 mb-1">{group.label}</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {group.modes.map(m => (
                                                        <span key={m} className={`text-[10px] px-2 py-0.5 rounded-full border ${MODE_COLORS[m] || "bg-slate-700 text-slate-400 border-slate-600"}`}>{m}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                                            <div className="text-amber-400 font-semibold">{t.registrations || 0}</div>
                                            <div className="text-slate-500 text-xs">Registered</div>
                                        </div>
                                        <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                                            <div className="text-amber-400 font-semibold">Best of {t.bestOf || 3}</div>
                                            <div className="text-slate-500 text-xs">Format</div>
                                        </div>
                                    </div>
                                    {t.prize && <div className="text-center mb-4"><span className="badge-gold">{t.prize}</span></div>}
                                    <Link to={`/tournaments/${t.id}`}
                                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${t.status === "completed" ? "bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none" : "btn-gold"}`}>
                                        {t.status === "completed" ? "Tournament Ended" : "View & Register"} <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}