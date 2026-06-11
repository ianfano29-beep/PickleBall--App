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
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                        {filtered.map(t => (
                            <div key={t.id} className="group relative overflow-hidden bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(245,158,11,0.1)]">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-300 opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        {t.status !== "completed" ? (
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1.5 ${t.status === "ongoing" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                                                {t.status === "ongoing" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                                                {t.status === "ongoing" ? "Live" : "Upcoming"}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                                                Completed
                                            </span>
                                        )}
                                        <div className="text-slate-400 text-[10px] flex flex-col items-end gap-0.5 font-medium">
                                            <span className="flex items-center gap-1"><Calendar size={10} /> {t.date || "TBD"}</span>
                                            {t.callTime && <span className="flex items-center gap-1"><Clock size={10} /> {formatCallTime(t.callTime)}</span>}
                                        </div>
                                    </div>
                                    <h3 className="text-white font-bold text-base mb-1 truncate" title={t.name}>{t.name}</h3>
                                    {t.description && <p className="text-slate-500 text-[11px] mb-2 line-clamp-2 leading-relaxed">{t.description}</p>}
                                    {t.announcement && <p className="text-amber-400/80 text-[10px] mb-2 line-clamp-1 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-400"></span>{t.announcement}</p>}
                                    
                                    <div className="mb-4 space-y-1.5 min-h-[36px]">
                                        {t.blindPairing && (
                                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                <Shuffle size={8} /> Blind Pairing
                                            </span>
                                        )}
                                        {groupModesForDisplay(t.modes).map(group => (
                                            <div key={group.label} className="flex flex-wrap items-center gap-1">
                                                <span className="text-[9px] text-slate-500 uppercase tracking-wide">{group.label}:</span>
                                                {group.modes.map(m => (
                                                    <span key={m} className={`text-[9px] px-1.5 py-0.5 rounded-md ${MODE_COLORS[m] || "bg-slate-800 text-slate-400"}`}>{m}</span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between bg-slate-800/40 rounded-xl p-2.5 mb-4">
                                        <div className="text-center flex-1 border-r border-slate-700/50">
                                            <div className="text-amber-400 font-bold text-sm leading-none mb-1">{t.registrations || 0}</div>
                                            <div className="text-slate-500 text-[8px] uppercase tracking-wider">Players</div>
                                        </div>
                                        <div className="text-center flex-1">
                                            <div className="text-amber-400 font-bold text-sm leading-none mb-1">{t.bestOf ? `BO${t.bestOf}` : 'BO3'}</div>
                                            <div className="text-slate-500 text-[8px] uppercase tracking-wider">Format</div>
                                        </div>
                                    </div>

                                    {t.prize && <div className="mb-4"><span className="flex justify-center text-[10px] font-semibold bg-amber-500/10 text-amber-300 px-2 py-1.5 rounded-lg border border-amber-500/20 w-full truncate"><Trophy size={12} className="mr-1.5 text-amber-400" />{t.prize}</span></div>}

                                    <Link to={`/tournaments/${t.id}`}
                                        className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${t.status === "completed" ? "bg-slate-800/50 text-slate-500 cursor-not-allowed pointer-events-none" : "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02]"}`}>
                                        {t.status === "completed" ? "Ended" : "Details & Enter"} <ChevronRight size={14} />
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