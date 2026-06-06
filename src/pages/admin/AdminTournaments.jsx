import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDocsCachedFirst } from "../../lib/firestoreFetch";
import { Trophy, Plus, Trash2, Edit, Users, Calendar, Layers, X, Check, AlertCircle, EyeOff, Clock, Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import { MODE_COLORS, MODE_GROUPS, formatCallTime } from "../../lib/tournamentModes";
const STATUSES = ["upcoming", "ongoing", "completed"];

export default function AdminTournaments() {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const emptyForm = {
        name: "", description: "", date: "", callTime: "", prize: "", maxPlayers: "",
        modes: [], status: "upcoming", venue: "", bestOf: 3,
        announcement: "", blindPairing: false,
    };
    const [form, setForm] = useState(emptyForm);

    const fetchTournaments = async () => {
        setLoading(true);
        try {
            const snap = await getDocsCachedFirst(query(collection(db, "tournaments"), orderBy("createdAt", "desc")));
            setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch { setTournaments([]); }
        setLoading(false);
    };

    useEffect(() => { fetchTournaments(); }, []);

    const toggleMode = (mode) =>
        setForm(f => ({ ...f, modes: f.modes.includes(mode) ? f.modes.filter(m => m !== mode) : [...f.modes, mode] }));

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Tournament name required");
        if (form.modes.length === 0) return toast.error("Select at least one mode");
        setSaving(true);
        try {
            const ref = await addDoc(collection(db, "tournaments"), {
                ...form,
                maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : null,
                hidden: false,
                registrations: 0,
                createdAt: serverTimestamp(),
            });
            toast.success("Tournament created!");
            setShowCreate(false);
            setForm(emptyForm);
            fetchTournaments();
            navigate(`/admin/tournaments/${ref.id}`);
        } catch (e) { console.error(e); toast.error("Failed to create"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "tournaments", id));
            toast.success("Deleted");
            setDeleteId(null);
            fetchTournaments();
        } catch { toast.error("Delete failed"); }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await updateDoc(doc(db, "tournaments", id), { status });
            setTournaments(ts => ts.map(t => t.id === id ? { ...t, status } : t));
            toast.success(`Status → ${status}`);
        } catch { toast.error("Update failed"); }
    };

    return (
        <div className="min-h-screen court-grid pt-20 pb-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="pt-6 mb-8 flex items-end justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="font-display text-4xl tracking-wider text-white">MANAGE <span className="gradient-gold">TOURNAMENTS</span></h1>
                        <p className="text-slate-500 mt-1">Create, edit and control all competitions</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="btn-gold flex items-center gap-2">
                        <Plus size={16} /> New Tournament
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="card h-28 shimmer" />)}</div>
                ) : tournaments.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Trophy size={40} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No tournaments yet</p>
                        <button onClick={() => setShowCreate(true)} className="btn-gold mt-4 inline-flex items-center gap-2">
                            <Plus size={16} /> Create First Tournament
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tournaments.map(t => (
                            <div key={t.id} className="card p-5 hover:border-amber-500/20 transition-colors">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <h3 className="text-white font-semibold text-lg">{t.name}</h3>
                                            <select value={t.status} onChange={e => handleStatusChange(t.id, e.target.value)}
                                                className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none bg-transparent ${t.status === "ongoing" ? "border-emerald-500/40 text-emerald-400"
                                                        : t.status === "completed" ? "border-slate-600 text-slate-400"
                                                            : "border-amber-500/40 text-amber-400"}`}>
                                                {STATUSES.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                                            </select>
                                            {t.hidden && <span className="text-xs px-2 py-0.5 rounded-full border border-slate-600 text-slate-400 flex items-center gap-1"><EyeOff size={10} /> Hidden</span>}
                                            {t.blindPairing && <span className="text-xs px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-400">Blind Pairing</span>}
                                        </div>
                                        {t.description && <p className="text-slate-500 text-sm mb-2 line-clamp-1">{t.description}</p>}
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                                            <span className="flex items-center gap-1"><Calendar size={11} className="text-amber-400" /> {t.date || "No date"}{t.callTime ? ` · ${formatCallTime(t.callTime)}` : ""}</span>
                                            <span className="flex items-center gap-1"><Users size={11} className="text-amber-400" /> {t.registrations || 0} registered</span>
                                            <span className="flex items-center gap-1"><Layers size={11} className="text-amber-400" /> Best of {t.bestOf || 3}</span>
                                            {t.prize && <span>{t.prize}</span>}
                                            {t.venue && <span>{t.venue}</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(t.modes || []).map(m => (
                                                <span key={m} className={`text-xs px-2.5 py-1 rounded-full border ${MODE_COLORS[m] || "bg-slate-700/15 text-slate-400 border-slate-600/20"}`}>{m}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link to={`/admin/tournaments/${t.id}`}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm transition-colors">
                                            <Edit size={13} /> Manage
                                        </Link>
                                        <button onClick={() => setDeleteId(t.id)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 modal-bg z-50 flex items-start justify-center px-4 py-8 overflow-y-auto">
                    <div className="card p-6 max-w-xl w-full my-auto border-amber-500/15">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                                <Trophy size={18} className="text-amber-400" /> Create New Tournament
                            </h3>
                            <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="label">Tournament Name *</label>
                                <input type="text" required className="input-field" placeholder="e.g. Palm Dink & Smash Court Open 2025"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea rows={2} className="input-field resize-none" placeholder="Brief description..."
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Date *</label>
                                    <input type="date" required className="input-field"
                                        value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label flex items-center gap-1"><Clock size={12} className="text-amber-400" /> Call Time</label>
                                    <input type="time" className="input-field"
                                        value={form.callTime} onChange={e => setForm({ ...form, callTime: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="label">Venue</label>
                                <input type="text" className="input-field" placeholder="e.g. PickleZone Hall"
                                    value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
                            </div>
                            <div>
                                <label className="label flex items-center gap-1"><Megaphone size={12} className="text-amber-400" /> Extra Announcement</label>
                                <textarea rows={2} className="input-field resize-none" placeholder="e.g. Best Outfit wins a prize!"
                                    value={form.announcement} onChange={e => setForm({ ...form, announcement: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Prize</label>
                                    <input type="text" className="input-field" placeholder="e.g. ₱10,000"
                                        value={form.prize} onChange={e => setForm({ ...form, prize: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Max Players</label>
                                    <input type="number" className="input-field" placeholder="Leave blank = open"
                                        value={form.maxPlayers} onChange={e => setForm({ ...form, maxPlayers: e.target.value })} />
                                </div>
                            </div>

                            {/* Best Of selector */}
                            <div>
                                <label className="label">Match Format (Best of…)</label>
                                <div className="flex gap-2">
                                    {[1, 3, 5, 7].map(n => (
                                        <button type="button" key={n} onClick={() => setForm({ ...form, bestOf: n })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${form.bestOf === n ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`}>
                                            Best of {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Modes — grouped */}
                            <div>
                                <label className="label">Competition Modes * (select all that apply)</label>
                                <div className="space-y-3">
                                    {MODE_GROUPS.map(group => (
                                        <div key={group.label}>
                                            <div className="text-xs text-slate-500 mb-1.5">{group.label} · {group.subtitle}</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {group.modes.map(mode => (
                                                    <button type="button" key={mode} onClick={() => toggleMode(mode)}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${form.modes.includes(mode) ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`}>
                                                        {mode}
                                                        {form.modes.includes(mode) && <Check size={12} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 p-4 rounded-xl border border-slate-700 bg-slate-800/40">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={form.blindPairing}
                                        onChange={e => setForm({ ...form, blindPairing: e.target.checked })}
                                        className="w-4 h-4 rounded accent-amber-500" />
                                    <div>
                                        <div className="text-white text-sm font-medium">Blind Pairing</div>
                                        <div className="text-slate-500 text-xs">Players register solo; partners are randomly assigned when the bracket is generated.</div>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-dark flex-1 py-3">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-gold flex-1 py-3 flex items-center justify-center gap-2">
                                    {saving ? "Creating..." : <><Plus size={15} /> Create Tournament</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="fixed inset-0 modal-bg z-50 flex items-center justify-center px-4">
                    <div className="card p-6 max-w-sm w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                                <AlertCircle size={20} className="text-red-400" />
                            </div>
                            <h3 className="text-white font-semibold">Delete Tournament?</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-5">This will permanently delete the tournament and cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="btn-dark flex-1 py-2.5 text-sm">Keep It</button>
                            <button onClick={() => handleDelete(deleteId)} className="btn-red flex-1 py-2.5 text-sm">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}