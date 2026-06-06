import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLogin() {
    const { loginAdmin } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await loginAdmin();
            toast.success("Welcome, Admin!");
            navigate("/admin");
        } catch {
            toast.error("Invalid admin credentials.");
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen hero-bg flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-500/20 border-2 border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
                        <Shield size={28} className="text-amber-400" />
                    </div>
                    <h1 className="font-display text-3xl tracking-widest text-white">ADMIN PORTAL</h1>
                    <p className="text-slate-500 text-sm mt-1">Restricted — authorized personnel only</p>
                </div>

                <div className="card p-8 border-amber-500/10">
                    <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 mb-6">
                        <Shield size={14} className="text-amber-400 shrink-0" />
                        <p className="text-amber-400/80 text-xs">Sign in with your Palm Dink & Smash Court admin credentials</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="label">Admin Email</label>
                            <div className="relative">
                                <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="text" disabled value="pickle@gmail.com"
                                    className="input-field pl-10 opacity-60 cursor-not-allowed" />
                            </div>
                        </div>

                        <div>
                            <label className="label">Admin Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type={showPass ? "text" : "password"} required
                                    className="input-field pl-10 pr-10" placeholder="Enter admin password"
                                    value={password} onChange={e => setPassword(e.target.value)} />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 mt-2">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                                    </svg>Verifying...
                                </span>
                            ) : <><Shield size={16} /> Enter Admin Panel</>}
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-600 text-xs mt-4">
                    Not an admin?{" "}
                    <Link to="/" className="text-amber-500/60 hover:text-amber-400 transition-colors">Return to home →</Link>
                </p>
            </div>
        </div>
    );
}