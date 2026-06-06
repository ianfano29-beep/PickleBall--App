import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { getDocsCachedFirst } from "../../lib/firestoreFetch";
import { getPaymentProofSrc } from "../../lib/paymentProofFirestore";
import { useAuth } from "../../context/AuthContext";
import { Trophy, CheckCircle, Clock, XCircle, ChevronRight, Image as ImageIcon, Shuffle } from "lucide-react";
import { MODE_COLORS } from "../../lib/tournamentModes";

const STATUS_CFG = {
    pending: { label: "Pending", cls: "badge-gold", Icon: Clock },
    confirmed: { label: "Confirmed", cls: "badge-green", Icon: CheckCircle },
    rejected: { label: "Rejected", cls: "badge-red", Icon: XCircle },
};

export default function MyRegistrations() {
    const { user } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const q = query(
                    collection(db, "registrations"),
                    where("userId", "==", user.uid)
                );
                const snap = await getDocsCachedFirst(q);
                let regs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort client-side to avoid requiring a Firestore composite index
                regs.sort((a, b) => {
                    const tA = a.createdAt?.toMillis?.() || 0;
                    const tB = b.createdAt?.toMillis?.() || 0;
                    return tB - tA;
                });
                setRegistrations(regs);
            } catch (err) {
                console.error("Error fetching registrations:", err);
                setRegistrations([]);
            }
            setLoading(false);
        })();
    }, [user]);

    return (
        <div className="min-h-screen court-grid pt-20 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="pt-6 mb-8">
                    <h1 className="font-display text-4xl tracking-wider text-white">
                        MY <span className="gradient-gold">REGISTRATIONS</span>
                    </h1>
                    <p className="text-slate-500 mt-1">Track all your tournament sign-ups</p>
                </div>

                {loading ? (
                    <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="card h-28 shimmer" />)}</div>
                ) : registrations.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Trophy size={40} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No registrations yet</p>
                        <p className="text-slate-600 text-sm mt-1 mb-5">Browse open tournaments and sign up!</p>
                        <Link to="/tournaments" className="btn-gold inline-flex items-center gap-2">
                            Browse Tournaments <ChevronRight size={14} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {registrations.map(reg => {
                            const cfg = STATUS_CFG[reg.status] || STATUS_CFG.pending;
                            return (
                                <div key={reg.id} className="card p-5 hover:border-amber-500/20 transition-colors">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            {reg.playerPhotoDataUrl ? (
                                                <img src={reg.playerPhotoDataUrl} alt={reg.playerName} className="w-12 h-12 rounded-xl object-cover border border-slate-600 shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-white shrink-0">
                                                    {(reg.playerName?.[0] || "?").toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="text-white font-semibold">{reg.tournamentName}</h3>
                                                <span className={cfg.cls}>
                                                    <cfg.Icon size={11} /> {cfg.label}
                                                </span>
                                            </div>
                                            <div className="text-white text-sm font-medium">{reg.playerName}</div>
                                            <div className="flex flex-wrap gap-2 text-sm text-slate-500 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${MODE_COLORS[reg.mode] || "bg-slate-700 text-slate-400 border-slate-600"}`}>{reg.mode}</span>
                                                {reg.partner && (
                                                    <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                        {reg.partnerPhotoDataUrl && (
                                                            <img src={reg.partnerPhotoDataUrl} alt={reg.partner} className="w-5 h-5 rounded-full object-cover border border-slate-600" />
                                                        )}
                                                        Partner: <span className="text-slate-300">{reg.partner}</span>
                                                    </span>
                                                )}
                                                {reg.blindPairing && !reg.partner && (
                                                    <span className="flex items-center gap-1 text-purple-400 text-xs">
                                                        <Shuffle size={10} /> Blind pairing — partner assigned later
                                                    </span>
                                                )}
                                            </div>
                                            {reg.status === "pending" && (
                                                <p className="text-slate-600 text-xs mt-2">Awaiting admin confirmation.</p>
                                            )}
                                            {reg.status === "confirmed" && (
                                                <p className="text-emerald-500 text-xs mt-2">You're in! Check the bracket once published.</p>
                                            )}
                                            {reg.status === "rejected" && (
                                                <p className="text-red-400 text-xs mt-2">Registration was not accepted.</p>
                                            )}
                                            {getPaymentProofSrc(reg) && (
                                                <a href={getPaymentProofSrc(reg)} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-amber-400 hover:text-amber-300">
                                                    <ImageIcon size={12} /> View GCash payment proof
                                                </a>
                                            )}
                                            </div>
                                        </div>
                                        <Link to={`/tournaments/${reg.tournamentId}`}
                                            className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1 shrink-0 transition-colors">
                                            View <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}