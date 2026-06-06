import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDocsCachedFirst } from "../../lib/firestoreFetch";
import { encodeProfileImageForFirestore } from "../../lib/imageUtils";
import { Users, Plus, Trash2, Edit, X, ImagePlus, UserCircle, Search, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminPlayers() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [search, setSearch] = useState("");

    const emptyForm = { id: null, fullName: "", photoDataUrl: "" };
    const [form, setForm] = useState(emptyForm);

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const [pSnap, rSnap] = await Promise.all([
                getDocsCachedFirst(query(collection(db, "players"), orderBy("createdAt", "desc"))),
                getDocsCachedFirst(collection(db, "registrations"))
            ]);
            
            const dbPlayers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const existingNames = new Set(dbPlayers.map(p => p.fullName?.toLowerCase().trim()));
            
            const virtualPlayers = [];
            rSnap.docs.forEach(d => {
                const data = d.data();
                const p1 = (data.playerName || "").trim();
                const p2 = (data.partner || "").trim();
                
                if (p1 && !existingNames.has(p1.toLowerCase())) {
                    existingNames.add(p1.toLowerCase());
                    virtualPlayers.push({ id: "virt_" + p1, fullName: p1, isVirtual: true });
                }
                if (p2 && !existingNames.has(p2.toLowerCase())) {
                    existingNames.add(p2.toLowerCase());
                    virtualPlayers.push({ id: "virt_" + p2, fullName: p2, isVirtual: true });
                }
            });

            setPlayers([...dbPlayers, ...virtualPlayers]);
        } catch (err) { 
            console.error(err);
            setPlayers([]); 
        }
        setLoading(false);
    };

    useEffect(() => { fetchPlayers(); }, []);

    const handleOpenCreate = () => {
        setForm(emptyForm);
        setShowModal(true);
    };

    const handleOpenEdit = (player) => {
        setForm({ id: player.id, fullName: player.fullName || "", photoDataUrl: player.photoDataUrl || "" });
        setShowModal(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const dataUrl = await encodeProfileImageForFirestore(file);
            setForm({ ...form, photoDataUrl: dataUrl });
        } catch (err) {
            toast.error(err.message || "Failed to process image");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.fullName.trim()) return toast.error("Player name required");
        
        setSaving(true);
        try {
            const payload = {
                fullName: form.fullName.trim(),
                photoDataUrl: form.photoDataUrl,
                updatedAt: serverTimestamp(),
            };

            if (form.id && !form.id.startsWith("virt_")) {
                // Edit
                await updateDoc(doc(db, "players", form.id), payload);
                toast.success("Player updated");
                setPlayers(ps => ps.map(p => p.id === form.id ? { ...p, ...payload } : p));
            } else {
                // Create
                payload.createdAt = serverTimestamp();
                const ref = await addDoc(collection(db, "players"), payload);
                toast.success(form.id?.startsWith("virt_") ? "Player saved to directory!" : "Player created!");
                setPlayers(ps => {
                    const filtered = form.id?.startsWith("virt_") ? ps.filter(p => p.id !== form.id) : ps;
                    return [{ id: ref.id, ...payload }, ...filtered];
                });
            }
            setShowModal(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save player");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (id.startsWith("virt_")) {
            toast.error("Auto-detected players cannot be deleted here. Delete their registration instead.");
            setDeleteId(null);
            return;
        }
        try {
            await deleteDoc(doc(db, "players", id));
            toast.success("Deleted");
            setDeleteId(null);
            setPlayers(ps => ps.filter(p => p.id !== id));
        } catch { toast.error("Delete failed"); }
    };

    const filtered = players.filter(p => p.fullName?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen court-grid pt-20 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="pt-6 mb-8 flex items-end justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="font-display text-4xl tracking-wider text-white">MANAGE <span className="gradient-gold">PLAYERS</span></h1>
                        <p className="text-slate-500 mt-1">Add players to make registration auto-suggest work flawlessly</p>
                    </div>
                    <button onClick={handleOpenCreate} className="btn-gold flex items-center gap-2">
                        <Plus size={16} /> New Player
                    </button>
                </div>

                <div className="relative mb-6">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" className="input-field pl-10" placeholder="Search players..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {loading ? (
                    <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="card h-20 shimmer" />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Users size={40} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No players found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filtered.map(p => (
                            <div key={p.id} className="card p-4 hover:border-amber-500/20 transition-colors flex items-center gap-4">
                                {p.photoDataUrl ? (
                                    <img src={p.photoDataUrl} alt={p.fullName} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                                        <UserCircle size={24} className="text-slate-500" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold truncate">{p.fullName}</h3>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => handleOpenEdit(p)}
                                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl transition-colors">
                                        <Edit size={15} />
                                    </button>
                                    <button onClick={() => setDeleteId(p.id)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 modal-bg z-50 flex items-start justify-center px-4 py-8 overflow-y-auto">
                    <div className="card p-6 max-w-sm w-full my-auto border-amber-500/15">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                                <Users size={18} className="text-amber-400" /> {form.id ? "Edit Player" : "Add Player"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="flex flex-col items-center">
                                <label className="relative cursor-pointer group">
                                    <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleImageUpload} />
                                    {form.photoDataUrl ? (
                                        <div className="relative">
                                            <img src={form.photoDataUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-slate-800 group-hover:border-amber-500/50 transition-colors" />
                                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <ImagePlus size={20} className="text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 group-hover:border-amber-500/50 flex flex-col items-center justify-center transition-colors">
                                            <ImagePlus size={24} className="text-slate-500 group-hover:text-amber-400 mb-1" />
                                            <span className="text-[10px] text-slate-500">Upload</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <div>
                                <label className="label">Full Name *</label>
                                <input type="text" required className="input-field" placeholder="Player's name"
                                    value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-dark flex-1 py-3">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-gold flex-1 py-3 flex items-center justify-center gap-2">
                                    {saving ? "Saving..." : <><Check size={15} /> Save Player</>}
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
                        <h3 className="text-white font-semibold mb-2">Delete Player?</h3>
                        <p className="text-slate-400 text-sm mb-5">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="btn-dark flex-1 py-2.5 text-sm">Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} className="btn-red flex-1 py-2.5 text-sm">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
