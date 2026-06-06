import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, User, Phone, Eye, EyeOff, Trophy, Hash } from "lucide-react";
import toast from "react-hot-toast";

export default function Register() {
    const { registerCustomer } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ fullName: "", email: "", phone: "", age: "", password: "", confirm: "" });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const set = k => e => setForm({ ...form, [k]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) return toast.error("Passwords don't match!");
        if (form.password.length < 6) return toast.error("Password must be at least 6 characters.");
        setLoading(true);
        try {
            await registerCustomer(form);
            toast.success("Account created! Welcome to Palm Dink & Smash Court");
            navigate("/tournaments");
        } catch (err) {
            if (err.code === "auth/email-already-in-use") toast.error("Email already registered.");
            else toast.error("Registration failed. Try again.");
        } finally { setLoading(false); }
    };

    const fields = [
        { key: "fullName", label: "Full Name", type: "text", placeholder: "Juan dela Cruz", icon: User },
        { key: "email", label: "Email Address", type: "email", placeholder: "you@example.com", icon: Mail },
        { key: "phone", label: "Phone Number", type: "tel", placeholder: "09XX-XXX-XXXX", icon: Phone },
        { key: "age", label: "Age", type: "number", placeholder: "e.g. 25", icon: Hash },
    ];

    return (
        <div className="min-h-screen hero-bg flex items-center justify-center px-4 pt-20 pb-10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
                        <Trophy size={24} className="text-slate-950" />
                    </div>
                    <h1 className="font-display text-3xl tracking-widest text-white">JOIN PALM DINK & SMASH COURT</h1>
                    <p className="text-slate-500 text-sm mt-1">Create your player profile and start competing</p>
                </div>
                <div className="card p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {fields.map(({ key, label, type, placeholder, icon: Icon }) => (
                            <div key={key}>
                                <label className="label">{label}</label>
                                <div className="relative">
                                    <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type={type} required={key !== "phone"} className="input-field pl-10" placeholder={placeholder}
                                        value={form[key]} onChange={set(key)} />
                                </div>
                            </div>
                        ))}
                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type={showPass ? "text" : "password"} required className="input-field pl-10 pr-10" placeholder="At least 6 characters"
                                    value={form.password} onChange={set("password")} />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="label">Confirm Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type={showPass ? "text" : "password"} required className="input-field pl-10" placeholder="Repeat password"
                                    value={form.confirm} onChange={set("confirm")} />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 mt-2">
                            {loading ? "Creating Account..." : "Create Player Account"}
                        </button>
                    </form>
                    <p className="text-center text-slate-500 text-sm mt-5">
                        Already registered?{" "}
                        <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}