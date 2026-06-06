import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, Phone, Hash, Save, Edit2 } from "lucide-react";
import toast from "react-hot-toast";

export default function Profile() {
    const { user, userProfile, updateUserProfile } = useAuth();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        fullName: userProfile?.fullName || "",
        phone: userProfile?.phone || "",
        age: userProfile?.age || "",
        skillLevel: userProfile?.skillLevel || "beginner",
    });
    const set = k => e => setForm({ ...form, [k]: e.target.value });

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateUserProfile(form);
            toast.success("Profile updated!");
            setEditing(false);
        } catch { toast.error("Failed to update profile"); }
        setSaving(false);
    };

    return (
        <div className="min-h-screen court-grid pt-20 pb-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="pt-6 mb-8">
                    <h1 className="font-display text-4xl tracking-wider text-white">
                        MY <span className="gradient-gold">PROFILE</span>
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your player account</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                    {/* Avatar card */}
                    <div className="card p-6 text-center">
                        <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="font-display text-4xl text-amber-400">
                                {(userProfile?.fullName || user?.email || "P")[0].toUpperCase()}
                            </span>
                        </div>
                        <h3 className="text-white font-semibold">{userProfile?.fullName || "Player"}</h3>
                        <p className="text-slate-500 text-sm mt-0.5 truncate">{user?.email}</p>
                        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Skill</span>
                                <span className="text-white capitalize">{userProfile?.skillLevel || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Age</span>
                                <span className="text-white">{userProfile?.age || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Phone</span>
                                <span className="text-white text-xs">{userProfile?.phone || "—"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Edit form */}
                    <div className="sm:col-span-2 card p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <User size={16} className="text-amber-400" /> Player Information
                            </h3>
                            {!editing
                                ? <button onClick={() => setEditing(true)} className="btn-dark text-xs py-2 px-3 flex items-center gap-1.5">
                                    <Edit2 size={12} /> Edit
                                </button>
                                : <button onClick={() => setEditing(false)} className="text-slate-500 text-xs hover:text-white transition-colors">
                                    Cancel
                                </button>
                            }
                        </div>

                        <div className="space-y-4">
                            {[
                                { key: "fullName", label: "Full Name", type: "text", icon: User },
                                { key: "phone", label: "Phone Number", type: "tel", icon: Phone },
                                { key: "age", label: "Age", type: "number", icon: Hash },
                            ].map(({ key, label, type, icon: Icon }) => (
                                <div key={key}>
                                    <label className="label">{label}</label>
                                    <div className="relative">
                                        <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input type={type} disabled={!editing}
                                            className={`input-field pl-10 ${!editing ? "opacity-60 cursor-not-allowed" : ""}`}
                                            value={form[key]} onChange={set(key)} />
                                    </div>
                                </div>
                            ))}

                            <div>
                                <label className="label">Email (cannot change)</label>
                                <div className="relative">
                                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="email" disabled className="input-field pl-10 opacity-60 cursor-not-allowed" value={user?.email || ""} />
                                </div>
                            </div>

                            <div>
                                <label className="label">Skill Level</label>
                                <select disabled={!editing}
                                    className={`input-field ${!editing ? "opacity-60 cursor-not-allowed" : ""}`}
                                    value={form.skillLevel} onChange={set("skillLevel")}>
                                    {["beginner", "intermediate", "advanced", "pro"].map(s => (
                                        <option key={s} value={s} className="bg-slate-900 capitalize">
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {editing && (
                                <button onClick={handleSave} disabled={saving}
                                    className="btn-gold w-full py-3 flex items-center justify-center gap-2">
                                    {saving ? "Saving..." : <><Save size={15} /> Save Changes</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}