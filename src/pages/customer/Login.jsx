import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, Trophy } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
    const { loginCustomer } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await loginCustomer(form.email, form.password);
            toast.success("Welcome back, Champion!");
            navigate("/tournaments");
        } catch (err) {
            toast.error(err.code === "auth/invalid-credential" ? "Invalid email or password" : "Login failed. Try again.");
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen hero-bg flex items-center justify-center px-4 pt-16">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
                        <Trophy size={24} className="text-slate-950" />
                    </div>
                    <h1 className="font-display text-3xl tracking-widest text-white">PLAYER LOGIN</h1>
                    <p className="text-slate-500 text-sm mt-1">Sign in to your Palm Dink & Smash Court account</p>
                </div>
                <div className="card p-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="label">Email Address</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="email" required className="input-field pl-10" placeholder="you@example.com"
                                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type={showPass ? "text" : "password"} required className="input-field pl-10 pr-10" placeholder="Your password"
                                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                                    </svg>Signing In...
                                </span>
                            ) : <><Trophy size={16} /> Sign In</>}
                        </button>
                    </form>
                    <p className="text-center text-slate-500 text-sm mt-5">
                        No account?{" "}
                        <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium">Register as a Player</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}