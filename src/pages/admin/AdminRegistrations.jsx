import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../firebase";
import { collection, orderBy, query, updateDoc, doc, serverTimestamp, where } from "firebase/firestore";
import { getDocsCachedFirst } from "../../lib/firestoreFetch";
import PaymentProofModal from "../../components/PaymentProofModal";
import { hasPaymentProof, getPaymentProofSrc } from "../../lib/paymentProofFirestore";
import { Users, Check, X, Search, ChevronRight, RefreshCw, Filter, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { MODE_COLORS } from "../../lib/tournamentModes";

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tournamentFilter, setTournamentFilter] = useState("");
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [paymentModalReg, setPaymentModalReg] = useState(null);
  const [viewedPaymentMap, setViewedPaymentMap] = useState({});

  const fetchTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const snap = await getDocsCachedFirst(query(collection(db, "tournaments"), orderBy("createdAt", "desc")));
      const tData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTournaments(tData);
      if (tData.length > 0) {
        setTournamentFilter(tData[0].id);
      }
    } catch { setTournaments([]); }
    setLoadingTournaments(false);
  };

  const fetchRegistrations = async () => {
    if (!tournamentFilter) {
      setRegistrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocsCachedFirst(query(
        collection(db, "registrations"),
        where("tournamentId", "==", tournamentFilter)
      ));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setRegistrations(data);
    } catch (err) {
      console.error(err);
      setRegistrations([]); 
    }
    setLoading(false);
  };

  const updateStatus = async (regId, status) => {
    try {
      await updateDoc(doc(db, "registrations", regId), { status, reviewedAt: serverTimestamp() });
      setRegistrations(rs => rs.map(r => r.id === regId ? { ...r, status } : r));
      toast.success(`Registration ${status}`);
    } catch { toast.error("Update failed"); }
  };

  const openPaymentModal = (reg) => {
    setViewedPaymentMap((m) => ({ ...m, [reg.id]: true }));
    setPaymentModalReg(reg);
  };

  const canConfirm = (reg) => {
    if (reg.status !== "pending") return true;
    if (!hasPaymentProof(reg)) return false;
    return !!viewedPaymentMap[reg.id];
  };

  const requestConfirm = (reg) => {
    if (reg.status === "pending" && !hasPaymentProof(reg)) {
      toast.error("Cannot confirm: no GCash payment proof on file.");
      return;
    }
    if (reg.status === "pending" && hasPaymentProof(reg) && !viewedPaymentMap[reg.id]) {
      toast.error('Open "View payment" and verify the receipt before confirming.');
      return;
    }
    updateStatus(reg.id, "confirmed");
  };

  useEffect(() => { fetchTournaments(); }, []);
  useEffect(() => { if (!loadingTournaments) fetchRegistrations(); }, [tournamentFilter, loadingTournaments]);

  const filtered = registrations.filter(r => {
    const s = search.toLowerCase();
    const matchSearch = (r.playerName || "").toLowerCase().includes(s)
      || (r.tournamentName || "").toLowerCase().includes(s)
      || (r.email || "").toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: registrations.length,
    pending: registrations.filter(r => r.status === "pending").length,
    confirmed: registrations.filter(r => r.status === "confirmed").length,
    rejected: registrations.filter(r => r.status === "rejected").length,
  };

  return (
    <div className="min-h-screen court-grid pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="pt-6 mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-wider text-white">
              ALL <span className="gradient-gold">REGISTRATIONS</span>
            </h1>
            <p className="text-slate-500 mt-1">Review and approve player sign-ups</p>
          </div>
          <button onClick={fetchRegistrations} className="btn-dark flex items-center gap-2 text-sm py-2.5">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {Object.entries(counts).map(([key, val]) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                statusFilter === key ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              {key}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === key ? "bg-slate-950/30" : "bg-slate-700"}`}>
                {val}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" className="input-field pl-10" placeholder="Search by name, email or tournament..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500 shrink-0" />
            <select value={tournamentFilter} onChange={e => setTournamentFilter(e.target.value)}
              className="input-field py-2.5 text-sm" style={{ width: "auto", minWidth: 160 }}>
              <option value="" disabled className="bg-slate-900">Select Tournament</option>
              {tournaments.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="card h-20 shimmer" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Users size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No registrations found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting the filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(reg => (
              <div key={reg.id} className="card p-4 hover:border-amber-500/15 transition-colors">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Player info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {reg.playerPhotoDataUrl ? (
                      <a href={reg.playerPhotoDataUrl} target="_blank" rel="noopener noreferrer" title="View player photo">
                        <img src={reg.playerPhotoDataUrl} alt={reg.playerName} className="w-10 h-10 rounded-xl object-cover border border-slate-600 shrink-0 hover:border-amber-500/50 transition-colors" />
                      </a>
                    ) : (
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-white shrink-0">
                        {(reg.playerName?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium">{reg.playerName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${MODE_COLORS[reg.mode] || "bg-slate-700/20 text-slate-400 border-slate-600"}`}>
                          {reg.mode}
                        </span>
                      </div>
                      <div className="text-slate-500 text-xs truncate mt-0.5">
                        {reg.email}
                        {reg.phone && <> · {reg.phone}</>}
                        {reg.age && <> · Age {reg.age}</>}
                      </div>
                      {reg.partner && (
                        <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
                          {reg.partnerPhotoDataUrl && (
                            <a href={reg.partnerPhotoDataUrl} target="_blank" rel="noopener noreferrer" title="View partner photo">
                              <img src={reg.partnerPhotoDataUrl} alt={reg.partner} className="w-5 h-5 rounded-full object-cover border border-slate-600 hover:border-amber-500/50" />
                            </a>
                          )}
                          Partner: {reg.partner}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tournament */}
                  <div className="hidden sm:block text-center">
                    <Link to={`/admin/tournaments/${reg.tournamentId}`}
                      className="text-amber-400 hover:text-amber-300 text-xs font-medium flex items-center gap-1 transition-colors">
                      {reg.tournamentName} <ChevronRight size={12} />
                    </Link>
                    <div className="text-slate-600 text-xs mt-0.5">
                      {reg.createdAt?.toDate?.()?.toLocaleDateString() || ""}
                    </div>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${
                      reg.status === "confirmed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : reg.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/20"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
                      {reg.status}
                    </span>
                    {hasPaymentProof(reg) && (
                      <button type="button" onClick={() => openPaymentModal(reg)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-medium border border-amber-500/20 transition-colors">
                        <ImageIcon size={13} /> View payment
                      </button>
                    )}
                    {reg.status === "pending" && !hasPaymentProof(reg) && (
                      <span className="text-[10px] text-amber-500/80 px-1.5 py-0.5 rounded bg-amber-500/10">No proof</span>
                    )}
                    {reg.status !== "confirmed" && (
                      <button type="button" onClick={() => requestConfirm(reg)} disabled={!canConfirm(reg)}
                        title={canConfirm(reg) ? "Confirm" : hasPaymentProof(reg) ? "View payment first" : "Missing payment proof"}
                        className={`p-1.5 rounded-lg transition-colors ${canConfirm(reg)
                          ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}>
                        <Check size={14} />
                      </button>
                    )}
                    {reg.status !== "rejected" && (
                      <button type="button" onClick={() => updateStatus(reg.id, "rejected")}
                        title="Reject"
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentProofModal
        open={!!paymentModalReg}
        url={paymentModalReg ? getPaymentProofSrc(paymentModalReg) : ""}
        title={paymentModalReg ? `GCash proof — ${paymentModalReg.playerName}` : ""}
        onClose={() => setPaymentModalReg(null)}
      />
    </div>
  );
}