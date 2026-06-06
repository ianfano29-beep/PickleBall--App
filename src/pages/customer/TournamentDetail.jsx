import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
    doc, collection, addDoc, query, where,
    updateDoc, increment, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { getDocsCachedFirst } from "../../lib/firestoreFetch";
import { encodePaymentImageForFirestore, getPaymentProofSrc } from "../../lib/paymentProofFirestore";
import { encodeProfileImageForFirestore } from "../../lib/imageUtils";
import { useAuth } from "../../context/AuthContext";
import {
    Trophy, Users, Calendar, CheckCircle, ChevronRight,
    Layers, MapPin, Award, ImagePlus, Clock, Megaphone, User, Shuffle
} from "lucide-react";
import toast from "react-hot-toast";
import {
    MODE_COLORS, groupModesForDisplay, registrationNeedsPartner,
    getPairingLabel, formatCallTime
} from "../../lib/tournamentModes";
import { validateRegistrationDocSize, getRegistrationImageBudgetLabel } from "../../lib/registrationImages";

function getScoresArray(match, playerIndex) {
    if (Array.isArray(match?.scores)) return match.scores[playerIndex] || [];
    if (match?.scores && typeof match.scores === "object") {
        return playerIndex === 0
            ? (match.scores.player1 || [])
            : (match.scores.player2 || []);
    }
    return [];
}

function PhotoUpload({ label, preview, onFile, required }) {
    return (
        <div>
            <label className="label flex items-center gap-2">
                <User size={14} className="text-amber-400" />
                {label}{required ? " *" : ""}
            </label>
            <div className="flex items-center gap-3">
                {preview ? (
                    <img src={preview} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-slate-600 shrink-0" />
                ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        <User size={20} className="text-slate-600" />
                    </div>
                )}
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    className="text-slate-400 text-xs file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-amber-400 flex-1"
                    onChange={(ev) => onFile(ev.target.files?.[0] || null)}
                />
            </div>
        </div>
    );
}

export default function TournamentDetail() {
    const { id } = useParams();
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [myReg, setMyReg] = useState(null);
    const [selectedMode, setSelectedMode] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [brackets, setBrackets] = useState([]);

    const [fullName, setFullName] = useState("");
    const [partner, setPartner] = useState("");
    const [playerPhotoFile, setPlayerPhotoFile] = useState(null);
    const [playerPhotoPreview, setPlayerPhotoPreview] = useState("");
    const [partnerPhotoFile, setPartnerPhotoFile] = useState(null);
    const [partnerPhotoPreview, setPartnerPhotoPreview] = useState("");
    const [paymentFile, setPaymentFile] = useState(null);
    const [paymentPreview, setPaymentPreview] = useState("");

    useEffect(() => {
        if (!id) return;

        setLoading(true);
        const unsubT = onSnapshot(doc(db, "tournaments", id), (docSnap) => {
            if (docSnap.exists()) {
                const t = { id: docSnap.id, ...docSnap.data() };
                setTournament(t);
                setSelectedMode(prev => prev || (t.modes?.length ? t.modes[0] : ""));
            }
            setLoading(false);
        });

        const unsubB = onSnapshot(query(collection(db, "brackets"), where("tournamentId", "==", id)), (bSnap) => {
            setBrackets(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        let unsubR = () => {};
        if (user) {
            unsubR = onSnapshot(
                query(collection(db, "registrations"), where("tournamentId", "==", id), where("userId", "==", user.uid)),
                (regSnap) => {
                    if (!regSnap.empty) setMyReg({ id: regSnap.docs[0].id, ...regSnap.docs[0].data() });
                    else setMyReg(null);
                }
            );
        } else {
            setMyReg(null);
        }

        return () => { unsubT(); unsubB(); unsubR(); };
    }, [id, user]);

    useEffect(() => {
        if (showForm && !fullName) {
            setFullName(userProfile?.fullName || "");
        }
    }, [showForm, userProfile, fullName]);

    const resetForm = () => {
        setShowForm(false);
        setFullName("");
        setPartner("");
        setPlayerPhotoFile(null);
        setPartnerPhotoFile(null);
        setPaymentFile(null);
        setPlayerPhotoPreview(prev => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return ""; });
        setPartnerPhotoPreview(prev => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return ""; });
        setPaymentPreview(prev => { if (prev) URL.revokeObjectURL(prev); return ""; });
    };

    const handlePhotoFile = (file, setFile, setPreview) => {
        setFile(file);
        setPreview(prev => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return file ? URL.createObjectURL(file) : "";
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!user) { navigate("/login"); return; }
        if (!selectedMode) return toast.error("Please select a mode");
        if (!fullName.trim()) return toast.error("Please enter your full name");
        if (!playerPhotoFile) return toast.error("Please upload your profile picture");
        if (!paymentFile) return toast.error("Please upload a GCash payment screenshot");

        const needsPartner = registrationNeedsPartner(tournament, selectedMode);
        if (needsPartner) {
            if (!partner.trim()) return toast.error("Please enter your partner's full name");
            if (!partnerPhotoFile) return toast.error("Please upload your partner's picture");
        }

        setRegistering(true);
        try {
            const [paymentProofDataUrl, playerPhotoDataUrl, partnerPhotoDataUrl] = await Promise.all([
                encodePaymentImageForFirestore(paymentFile),
                encodeProfileImageForFirestore(playerPhotoFile),
                needsPartner ? encodeProfileImageForFirestore(partnerPhotoFile) : Promise.resolve(""),
            ]);

            const regData = {
                tournamentId: id,
                tournamentName: tournament.name,
                userId: user.uid,
                playerName: fullName.trim(),
                email: user.email,
                phone: userProfile?.phone || "",
                age: userProfile?.age || "",
                mode: selectedMode,
                partner: needsPartner ? partner.trim() : "",
                playerPhotoDataUrl,
                partnerPhotoDataUrl: needsPartner ? partnerPhotoDataUrl : "",
                blindPairing: !!tournament.blindPairing,
                paymentMethod: "GCash",
                paymentProofDataUrl,
                status: "pending",
            };
            validateRegistrationDocSize(regData);
            const ref = await addDoc(collection(db, "registrations"), {
                ...regData,
                createdAt: serverTimestamp(),
            });
            await updateDoc(doc(db, "tournaments", id), { registrations: increment(1) });
            setMyReg({ id: ref.id, ...regData });
            resetForm();
            toast.success("Registration submitted! Await confirmation.");
        } catch (err) {
            console.error(err);
            toast.error(err?.message || "Registration failed. Try again.");
        } finally { setRegistering(false); }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center pt-16">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!tournament) return (
        <div className="min-h-screen flex items-center justify-center pt-16 text-center">
            <div>
                <Trophy size={40} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">Tournament not found.</p>
            </div>
        </div>
    );

    const needsPartner = registrationNeedsPartner(tournament, selectedMode);
    const modeGroups = groupModesForDisplay(tournament.modes);

    return (
        <div className="min-h-screen court-grid pt-20 pb-12 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="pt-6 mb-8">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        {tournament.status !== "completed" && (
                            <span className={`text-xs px-3 py-1.5 rounded-full border ${tournament.status === "ongoing" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/20 text-amber-400 border-amber-500/20"}`}>
                                {tournament.status === "ongoing" ? "Live Now" : "Upcoming"}
                            </span>
                        )}
                        {tournament.blindPairing && (
                            <span className="text-xs px-3 py-1.5 rounded-full border border-purple-500/30 text-purple-400 flex items-center gap-1">
                                <Shuffle size={12} /> Blind Pairing
                            </span>
                        )}
                        {tournament.prize && <span className="badge-gold">Prize: {tournament.prize}</span>}
                    </div>
                    <h1 className="font-display text-5xl tracking-wider text-white mb-2">{tournament.name}</h1>
                    {tournament.description && <p className="text-slate-400 max-w-2xl">{tournament.description}</p>}
                    {tournament.announcement && (
                        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-2xl">
                            <Megaphone size={18} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-amber-200 text-sm">{tournament.announcement}</p>
                        </div>
                    )}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-5">
                        {/* Info cards */}
                        <div className="card p-6">
                            <h3 className="text-white font-semibold mb-4">Tournament Details</h3>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { icon: Calendar, label: "Date", val: tournament.date || "TBD" },
                                    ...(tournament.callTime ? [{ icon: Clock, label: "Call Time", val: formatCallTime(tournament.callTime) }] : []),
                                    { icon: Users, label: "Registered", val: tournament.registrations || 0 },
                                    { icon: Layers, label: "Format", val: `Best of ${tournament.bestOf || 3}` },
                                ].map(({ icon: Icon, label, val }) => (
                                    <div key={label} className="bg-slate-800/50 rounded-xl p-4 text-center">
                                        <Icon size={18} className="text-amber-400 mx-auto mb-1" />
                                        <div className="text-white font-semibold">{val}</div>
                                        <div className="text-slate-500 text-xs">{label}</div>
                                    </div>
                                ))}
                            </div>
                            {tournament.venue && (
                                <div className="flex items-center gap-2 mt-4 text-slate-400 text-sm">
                                    <MapPin size={14} className="text-amber-400" /> {tournament.venue}
                                </div>
                            )}
                            <div className="mt-3 text-slate-500 text-xs flex items-center gap-1.5">
                                <Users size={12} className="text-amber-400" />
                                {getPairingLabel(tournament)}
                            </div>
                        </div>

                        {/* Modes — grouped */}
                        <div className="card p-6">
                            <h3 className="text-white font-semibold mb-1">Competition Modes</h3>
                            <p className="text-slate-500 text-xs mb-4">Choose your division when registering</p>
                            <div className="space-y-5">
                                {modeGroups.length > 0 ? modeGroups.map(group => (
                                    <div key={group.label}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{group.label}</span>
                                            <span className="text-xs text-slate-600">· {group.subtitle}</span>
                                        </div>
                                        <div className="grid sm:grid-cols-2 gap-2">
                                            {group.modes.map(m => (
                                                <div key={m} className={`rounded-xl p-3.5 flex items-center gap-3 border ${MODE_COLORS[m] || "bg-slate-800/50 border-slate-700"}`}>
                                                    <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                                                        <Award size={14} className="text-current opacity-80" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium truncate">{m}</div>
                                                        <div className="text-xs opacity-60">Open for registration</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="grid sm:grid-cols-2 gap-2">
                                        {(tournament.modes || []).map(m => (
                                            <div key={m} className={`rounded-xl p-3.5 border ${MODE_COLORS[m] || "bg-slate-800/50 border-slate-700 text-white"}`}>
                                                <div className="text-sm font-medium">{m}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live Brackets */}
                        {brackets.length > 0 && (
                            <div className="card p-6">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Layers size={16} className="text-amber-400" /> Live Bracket
                                </h3>
                                {brackets.map(b => (
                                    <div key={b.id} className="mb-6 last:mb-0">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`text-xs px-2.5 py-1 rounded-full border ${MODE_COLORS[b.mode] || "bg-slate-700 text-slate-400 border-slate-600"}`}>{b.mode}</span>
                                            <span className="text-slate-500 text-xs">Best of {b.bestOf}</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <div className="inline-flex gap-6 min-w-max">
                                                {(b.rounds || []).map((round, rIdx) => (
                                                    <div key={rIdx} style={{ minWidth: 180 }}>
                                                        <div className="text-center mb-3">
                                                            <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">{round.label}</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {round.matches.map((match, mIdx) => (
                                                                <div key={mIdx} className={`rounded-xl border overflow-hidden ${match.winner ? "border-amber-500/40" : "border-slate-700"}`}>
                                                                    {[match.player1, match.player2].map((p, pi) => (
                                                                        <div key={pi} className={`flex items-center justify-between px-3 py-2 ${pi === 0 ? "border-b border-slate-800" : ""} ${match.winner === p ? "bg-amber-500/10" : ""}`}>
                                                                            <span className={`text-xs font-medium truncate flex-1 ${match.winner === p ? "text-amber-400" : p && p !== "TBD" ? "text-white" : "text-slate-600"}`}>
                                                                                {p || "TBD"}
                                                                            </span>
                                                                            <div className="flex gap-0.5 ml-1">
                                                                                {getScoresArray(match, pi).map((s, si) => (
                                                                                    <span key={si} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${match.winner === p ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"}`}>{s}</span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(() => {
                                                    const lastRound = b.rounds?.[b.rounds.length - 1];
                                                    const champ = lastRound?.matches?.[0]?.winner;
                                                    return champ ? (
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="text-center mb-3">
                                                                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Champion</span>
                                                            </div>
                                                            <div className="card p-4 border-amber-500/40 text-center" style={{ width: 140 }}>
                                                                <div className="text-amber-400 font-semibold text-xs">{champ}</div>
                                                            </div>
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div>
                        <div className="card p-5 sticky top-24">
                            {myReg ? (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle size={20} className="text-emerald-400" />
                                        <h3 className="text-white font-semibold">You're Registered!</h3>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        {myReg.playerPhotoDataUrl ? (
                                            <img src={myReg.playerPhotoDataUrl} alt={myReg.playerName} className="w-12 h-12 rounded-xl object-cover border border-slate-600" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white">
                                                {(myReg.playerName?.[0] || "?").toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-white font-medium text-sm">{myReg.playerName}</div>
                                            <div className="text-slate-500 text-xs">{myReg.mode}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm mb-4">
                                        {myReg.partner && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500">Partner</span>
                                                <span className="text-white flex items-center gap-1.5">
                                                    {myReg.partnerPhotoDataUrl && (
                                                        <img src={myReg.partnerPhotoDataUrl} alt={myReg.partner} className="w-5 h-5 rounded-full object-cover" />
                                                    )}
                                                    {myReg.partner}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Status</span>
                                            <span className={myReg.status === "confirmed" ? "text-emerald-400" : "text-amber-400"}>
                                                {myReg.status === "confirmed" ? "Confirmed ✓" : "Pending Review"}
                                            </span>
                                        </div>
                                        {getPaymentProofSrc(myReg) && (
                                            <div className="pt-2 rounded-xl border border-slate-700 overflow-hidden bg-slate-900/50">
                                                <p className="text-slate-500 text-xs px-2 py-1.5 border-b border-slate-800">Your GCash proof</p>
                                                <a href={getPaymentProofSrc(myReg)} target="_blank" rel="noopener noreferrer" className="block">
                                                    <img src={getPaymentProofSrc(myReg)} alt="Payment proof" className="w-full max-h-40 object-contain" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 text-amber-400 text-xs">
                                        {tournament.blindPairing
                                            ? "Your partner will be assigned randomly when the bracket is generated."
                                            : "Bracket will be published once all registrations are confirmed."}
                                    </div>
                                </div>
                            ) : tournament.status === "completed" ? (
                                <div className="text-center py-4">
                                    <Trophy size={30} className="text-slate-700 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm">This tournament has ended.</p>
                                </div>
                            ) : !user ? (
                                <div className="text-center">
                                    <Trophy size={30} className="text-amber-400 mx-auto mb-3" />
                                    <p className="text-white font-semibold mb-1">Ready to Compete?</p>
                                    <p className="text-slate-500 text-sm mb-4">Sign in to register for this tournament.</p>
                                    <div className="space-y-2">
                                        <button onClick={() => navigate("/login")} className="btn-gold w-full text-sm py-2.5">Sign In</button>
                                        <button onClick={() => navigate("/register")} className="btn-dark w-full text-sm py-2.5">Create Account</button>
                                    </div>
                                </div>
                            ) : tournament.registrationClosed ? (
                                <div className="text-center py-4">
                                    <Trophy size={30} className="text-slate-700 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm">Registration is currently closed.</p>
                                </div>
                            ) : !showForm ? (
                                <div>
                                    <h3 className="text-white font-semibold mb-2">Register Now</h3>
                                    <p className="text-slate-500 text-sm mb-2">Secure your spot in {tournament.name}.</p>
                                    <p className="text-slate-600 text-xs mb-1">{getPairingLabel(tournament)}</p>
                                    <p className="text-slate-600 text-[11px] mb-4">{getRegistrationImageBudgetLabel(registrationNeedsPartner(tournament, selectedMode))}</p>
                                    <button onClick={() => setShowForm(true)} className="btn-gold w-full py-3 flex items-center justify-center gap-2">
                                        <Trophy size={16} /> Register for Tournament
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleRegister}>
                                    <h3 className="text-white font-semibold mb-1">Register</h3>
                                    <p className="text-slate-500 text-xs mb-1">{getPairingLabel(tournament)}</p>
                                    <p className="text-slate-600 text-[11px] mb-4">{getRegistrationImageBudgetLabel(needsPartner)}</p>

                                    {/* Mode selection — grouped */}
                                    <label className="label mb-2">Select Division *</label>
                                    <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
                                        {modeGroups.length > 0 ? modeGroups.map(group => (
                                            <div key={group.label}>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{group.label}</div>
                                                <div className="space-y-1">
                                                    {group.modes.map(m => (
                                                        <button type="button" key={m} onClick={() => setSelectedMode(m)}
                                                            className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${selectedMode === m ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"}`}>
                                                            <div className="flex items-center justify-between">
                                                                <span>{m}</span>
                                                                {selectedMode === m && <CheckCircle size={12} />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )) : (tournament.modes || []).map(m => (
                                            <button type="button" key={m} onClick={() => setSelectedMode(m)}
                                                className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${selectedMode === m ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-slate-700 bg-slate-800 text-slate-400"}`}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mb-3">
                                        <label className="label">Your Full Name *</label>
                                        <input type="text" className="input-field" placeholder="Your full name" required
                                            value={fullName} onChange={e => setFullName(e.target.value)} />
                                    </div>

                                    <div className="mb-3">
                                        <PhotoUpload label="Your Profile Picture" preview={playerPhotoPreview} required
                                            onFile={(f) => handlePhotoFile(f, setPlayerPhotoFile, setPlayerPhotoPreview)} />
                                    </div>

                                    {needsPartner && (
                                        <>
                                            <div className="mb-3">
                                                <label className="label">Partner's Full Name *</label>
                                                <input type="text" className="input-field" placeholder="Partner's full name" required
                                                    value={partner} onChange={e => setPartner(e.target.value)} />
                                            </div>
                                            <div className="mb-3">
                                                <PhotoUpload label="Partner's Profile Picture" preview={partnerPhotoPreview} required
                                                    onFile={(f) => handlePhotoFile(f, setPartnerPhotoFile, setPartnerPhotoPreview)} />
                                            </div>
                                        </>
                                    )}

                                    <div className="mb-4">
                                        <label className="label flex items-center gap-2">
                                            <ImagePlus size={14} className="text-amber-400" />
                                            GCash payment screenshot *
                                        </label>
                                        <p className="text-slate-500 text-xs mb-2">Upload a clear photo of your GCash receipt (max 1 MB).</p>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                            className="text-slate-400 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-amber-400"
                                            onChange={(ev) => {
                                                const f = ev.target.files?.[0];
                                                setPaymentFile(f || null);
                                                setPaymentPreview(prev => {
                                                    if (prev) URL.revokeObjectURL(prev);
                                                    return f ? URL.createObjectURL(f) : "";
                                                });
                                            }}
                                        />
                                        {paymentPreview && (
                                            <img src={paymentPreview} alt="Preview" className="mt-2 rounded-lg border border-slate-700 max-h-36 w-full object-contain bg-slate-900" />
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={resetForm} className="btn-dark flex-1 py-2.5 text-sm">Cancel</button>
                                        <button type="submit" disabled={registering} className="btn-gold flex-1 py-2.5 text-sm flex items-center justify-center gap-1">
                                            {registering ? "Submitting..." : <><ChevronRight size={14} /> Submit</>}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
