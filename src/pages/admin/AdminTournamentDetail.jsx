import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
    doc, collection, query, where,
    updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { getDocCachedFirst, getDocsCachedFirst } from "../../lib/firestoreFetch";
import PaymentProofModal from "../../components/PaymentProofModal";
import { hasPaymentProof, getPaymentProofSrc } from "../../lib/paymentProofFirestore";
import {
    Users, ChevronLeft, Check, X, Layers,
    Shuffle, RefreshCw, AlertCircle, Calendar, MapPin, Image as ImageIcon, Trash2,
    Settings, Clock, Megaphone, EyeOff
} from "lucide-react";
import toast from "react-hot-toast";
import {
    MODE_COLORS, buildBracketSeedsFromRegistrations, formatCallTime, groupModesForDisplay
} from "../../lib/tournamentModes";

function shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildBracket(players, bestOf, type = "single_elimination") {
    if (type === "round_robin") {
        const seeded = [...players];
        if (seeded.length % 2 !== 0) seeded.push("BYE");
        const numRounds = seeded.length - 1;
        const rounds = [];
        for (let r = 0; r < numRounds; r++) {
            const matches = [];
            for (let i = 0; i < seeded.length / 2; i++) {
                const p1 = seeded[i];
                const p2 = seeded[seeded.length - 1 - i];
                const isBye1 = !p1 || p1 === "BYE";
                const isBye2 = !p2 || p2 === "BYE";
                matches.push({
                    id: `rr-r${r + 1}-m${i}`,
                    player1: p1 || "BYE",
                    player2: p2 || "BYE",
                    scores: { player1: [], player2: [] },
                    bestOf,
                    winner: isBye1 ? (p2 || "BYE") : isBye2 ? p1 : null,
                });
            }
            rounds.push({ round: r + 1, label: `Round ${r + 1}`, matches });
            const last = seeded.pop();
            seeded.splice(1, 0, last);
        }
        return rounds;
    }

    if (type === "double_elimination") {
        // Generating a basic structure: Winners Bracket, Losers Bracket, and Grand Finals.
        // We'll create the Winners Bracket exactly like single elimination.
        const size = Math.pow(2, Math.ceil(Math.log2(Math.max(players.length, 2))));
        const seeded = [...players];
        while (seeded.length < size) seeded.push(null);
        const shuffled = shuffleArr(seeded);
        const rounds = [];

        // Winners Round 1
        const r1 = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            const p1 = shuffled[i];
            const p2 = shuffled[i + 1];
            const isBye1 = !p1 || p1 === "BYE";
            const isBye2 = !p2 || p2 === "BYE";
            r1.push({
                id: `w-r1-m${i / 2}`,
                player1: p1 || "BYE",
                player2: p2 || "BYE",
                scores: { player1: [], player2: [] },
                bestOf,
                winner: isBye1 ? (p2 || "BYE") : isBye2 ? p1 : null,
            });
        }
        rounds.push({ round: 1, label: "Winners Round 1", matches: r1 });

        // Subsequent Winners Rounds
        let num = r1.length / 2;
        let rn = 2;
        while (num >= 1) {
            rounds.push({
                round: rn, label: num === 1 ? "Winners Final" : `Winners Round ${rn}`,
                matches: Array.from({ length: num }, (_, i) => ({
                    id: `w-r${rn}-m${i}`, player1: null, player2: null,
                    scores: { player1: [], player2: [] }, bestOf, winner: null,
                })),
            });
            num = Math.floor(num / 2);
            rn++;
        }

        // Generate Losers Bracket placeholders
        const losersRounds = Math.max(1, (rn - 1) * 2 - 2); // Approximation of loser rounds
        let lrMatches = r1.length / 2; 
        for (let lr = 1; lr <= losersRounds; lr++) {
            rounds.push({
                round: rn + lr - 1, label: lr === losersRounds ? "Losers Final" : `Losers Round ${lr}`,
                matches: Array.from({ length: Math.max(1, lrMatches) }, (_, i) => ({
                    id: `l-r${lr}-m${i}`, player1: null, player2: null,
                    scores: { player1: [], player2: [] }, bestOf, winner: null,
                })),
            });
            if (lr % 2 === 0) lrMatches = Math.floor(lrMatches / 2);
        }

        // Grand Finals
        rounds.push({
            round: 99, label: "Grand Finals",
            matches: [{
                id: "gf-m0", player1: null, player2: null,
                scores: { player1: [], player2: [] }, bestOf, winner: null,
            }]
        });

        wireDoubleElimination(rounds, size);
        cascadeBracketAfterBuild(rounds, "double_elimination");
        return rounds;
    }

    // Default Single Elimination
    const size = Math.pow(2, Math.ceil(Math.log2(Math.max(players.length, 2))));
    const seeded = [...players];
    while (seeded.length < size) seeded.push(null);
    const shuffled = shuffleArr(seeded);
    const rounds = [];

    // Round 1
    const r1 = [];
    for (let i = 0; i < shuffled.length; i += 2) {
        const p1 = shuffled[i];
        const p2 = shuffled[i + 1];
        const isBye1 = !p1 || p1 === "BYE";
        const isBye2 = !p2 || p2 === "BYE";
        r1.push({
            id: `r1-m${i / 2}`,
            player1: p1 || "BYE",
            player2: p2 || "BYE",
            scores: { player1: [], player2: [] },
            bestOf,
            winner: isBye1 ? (p2 || "BYE") : isBye2 ? p1 : null,
        });
    }
    rounds.push({ round: 1, label: "Round 1", matches: r1 });

    // Subsequent rounds
    let num = r1.length / 2;
    let rn = 2;
    while (num >= 1) {
        const label = num === 1 ? "Final"
            : num === 2 ? "Semi-Finals"
                : num === 4 ? "Quarter-Finals"
                    : `Round ${rn}`;
        rounds.push({
            round: rn, label,
            matches: Array.from({ length: num }, (_, i) => ({
                id: `r${rn}-m${i}`,
                player1: null, player2: null,
                scores: { player1: [], player2: [] }, bestOf, winner: null,
            })),
        });
        num = Math.floor(num / 2);
        rn++;
    }

    wireSingleElimination(rounds, size);
    cascadeBracketAfterBuild(rounds, "single_elimination");
    return rounds;
}

function findMatchById(rounds, matchId) {
    for (const round of rounds) {
        const match = round.matches.find(m => m.id === matchId);
        if (match) return match;
    }
    return null;
}

function placeInSlot(match, slot, player) {
    if (!match || !player || player === "BYE") return;
    match[slot] = player;
}

function getBracketSize(rounds, type) {
    if (type === "double_elimination") {
        const wr1 = rounds.find(r => r.matches?.[0]?.id?.startsWith("w-r1-"));
        if (wr1) return wr1.matches.length * 2;
    }
    const r1 = rounds[0];
    if (r1?.matches?.length) return r1.matches.length * 2;
    return 2;
}

function wireSingleElimination(rounds, size) {
    const depth = Math.log2(size);
    for (let wr = 1; wr < depth; wr++) {
        const matchCount = size / Math.pow(2, wr);
        for (let m = 0; m < matchCount; m++) {
            const match = findMatchById(rounds, `r${wr}-m${m}`);
            if (!match) continue;
            match.nextWinner = {
                matchId: `r${wr + 1}-m${Math.floor(m / 2)}`,
                slot: m % 2 === 0 ? "player1" : "player2",
            };
        }
    }
}

function wireDoubleElimination(rounds, size) {
    const wbDepth = Math.log2(size);
    const lbRoundCount = wbDepth > 1 ? (wbDepth - 1) * 2 : 1;

    for (let wr = 1; wr <= wbDepth; wr++) {
        const matchCount = size / Math.pow(2, wr);
        for (let m = 0; m < matchCount; m++) {
            const match = findMatchById(rounds, `w-r${wr}-m${m}`);
            if (!match) continue;

            if (wr < wbDepth) {
                match.nextWinner = {
                    matchId: `w-r${wr + 1}-m${Math.floor(m / 2)}`,
                    slot: m % 2 === 0 ? "player1" : "player2",
                };
            } else {
                match.nextWinner = { matchId: "gf-m0", slot: "player1" };
                match.nextLoser = { matchId: `l-r${lbRoundCount}-m0`, slot: "player2" };
            }

            if (wr === 1) {
                match.nextLoser = {
                    matchId: `l-r1-m${Math.floor(m / 2)}`,
                    slot: m % 2 === 0 ? "player1" : "player2",
                };
            } else if (wr < wbDepth) {
                match.nextLoser = { matchId: `l-r${(wr - 1) * 2}-m${m}`, slot: "player1" };
            }
        }
    }

    for (let lr = 1; lr <= lbRoundCount; lr++) {
        const dropRound = Math.ceil(lr / 2);
        const count = lr === lbRoundCount ? 1 : Math.max(1, size / Math.pow(2, dropRound + 1));
        for (let m = 0; m < count; m++) {
            const match = findMatchById(rounds, `l-r${lr}-m${m}`);
            if (!match) continue;
            if (lr < lbRoundCount) {
                if (lr % 2 === 1) {
                    match.nextWinner = { matchId: `l-r${lr + 1}-m${m}`, slot: "player2" };
                } else {
                    match.nextWinner = {
                        matchId: `l-r${lr + 1}-m${Math.floor(m / 2)}`,
                        slot: m % 2 === 0 ? "player1" : "player2",
                    };
                }
            } else {
                match.nextWinner = { matchId: "gf-m0", slot: "player2" };
            }
        }
    }
}

function ensureBracketWiring(rounds, type) {
    const sample = rounds[0]?.matches?.[0];
    if (sample?.nextWinner) return;
    const size = getBracketSize(rounds, type);
    if (type === "double_elimination") wireDoubleElimination(rounds, size);
    else wireSingleElimination(rounds, size || getBracketSize(rounds));
}

function advanceFromMatch(rounds, match, winner, type) {
    const loser = match.player1 === winner ? match.player2 : match.player1;

    if (match.nextWinner) {
        const wm = findMatchById(rounds, match.nextWinner.matchId);
        placeInSlot(wm, match.nextWinner.slot, winner);
    } else if (type !== "double_elimination" && type !== "round_robin") {
        for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
            const mIdx = rounds[rIdx].matches.indexOf(match);
            if (mIdx < 0) continue;
            if (rIdx + 1 < rounds.length) {
                const nm = rounds[rIdx + 1].matches[Math.floor(mIdx / 2)];
                if (mIdx % 2 === 0) nm.player1 = winner;
                else nm.player2 = winner;
            }
            break;
        }
    }

    if (match.nextLoser && loser && loser !== "BYE") {
        const lm = findMatchById(rounds, match.nextLoser.matchId);
        placeInSlot(lm, match.nextLoser.slot, loser);
    }
}

function tryAutoByeMatch(rounds, match, type) {
    if (!match || match.winner) return;
    const p1 = match.player1;
    const p2 = match.player2;
    const hasP1 = p1 && p1 !== "BYE";
    const hasP2 = p2 && p2 !== "BYE";
    if (p1 === "BYE" && hasP2) {
        match.winner = p2;
        advanceFromMatch(rounds, match, p2, type);
    } else if (p2 === "BYE" && hasP1) {
        match.winner = p1;
        advanceFromMatch(rounds, match, p1, type);
    }
}

function cascadeByeAdvances(rounds, type = "double_elimination") {
    let changed = true;
    let guard = 0;
    while (changed && guard < rounds.length * 20) {
        changed = false;
        guard++;
        for (const round of rounds) {
            for (const match of round.matches) {
                const before = match.winner;
                tryAutoByeMatch(rounds, match, type);
                if (!before && match.winner) changed = true;
            }
        }
    }
}

function cascadeBracketAfterBuild(rounds, type) {
    for (const round of rounds) {
        for (const match of round.matches) {
            if (match.winner) advanceFromMatch(rounds, match, match.winner, type);
        }
    }
    cascadeByeAdvances(rounds, type);
}

function normalizeModes(tournamentData, registrations = [], bracketDocs = []) {
    const fromTournament = Array.isArray(tournamentData?.modes) ? tournamentData.modes : [];
    const fromLegacyField = typeof tournamentData?.mode === "string" ? [tournamentData.mode] : [];
    const fromRegistrations = registrations.map(r => r.mode);
    const fromBrackets = bracketDocs.map(b => b.mode);

    return [...new Set(
        [...fromTournament, ...fromLegacyField, ...fromRegistrations, ...fromBrackets]
            .map(mode => (typeof mode === "string" ? mode.trim() : ""))
            .filter(Boolean)
    )];
}

function getScoresArray(match, playerIndex) {
    if (Array.isArray(match?.scores)) return match.scores[playerIndex] || [];
    if (match?.scores && typeof match.scores === "object") {
        return playerIndex === 0
            ? (match.scores.player1 || [])
            : (match.scores.player2 || []);
    }
    return [];
}

function setScoreValue(match, playerIndex, setIndex, value) {
    const normalized = {
        player1: [...getScoresArray(match, 0)],
        player2: [...getScoresArray(match, 1)],
    };
    if (playerIndex === 0) normalized.player1[setIndex] = value;
    else normalized.player2[setIndex] = value;
    match.scores = normalized;
}

export default function AdminTournamentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [brackets, setBrackets] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("registrations");
    const [activeMode, setActiveMode] = useState("");
    const [modes, setModes] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [confirmGen, setConfirmGen] = useState(false);
    const [paymentModalReg, setPaymentModalReg] = useState(null);
    const [viewedPaymentMap, setViewedPaymentMap] = useState({});
    const [bracketType, setBracketType] = useState("single_elimination");
    const [genMode, setGenMode] = useState("auto");
    const [blankSlots, setBlankSlots] = useState(8);
    const [editPlayerNode, setEditPlayerNode] = useState(null);
    const [allPlayers, setAllPlayers] = useState([]);
    const [activeSuggestField, setActiveSuggestField] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsForm, setSettingsForm] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    const STATUSES = ["upcoming", "ongoing", "completed"];

    const openSettings = () => {
        if (!tournament) return;
        setSettingsForm({
            description: tournament.description || "",
            date: tournament.date || "",
            callTime: tournament.callTime || "",
            venue: tournament.venue || "",
            prize: tournament.prize || "",
            announcement: tournament.announcement || "",
            blindPairing: !!tournament.blindPairing,
        });
        setShowSettings(true);
    };

    const saveSettings = async () => {
        if (!settingsForm) return;
        setSavingSettings(true);
        try {
            await updateDoc(doc(db, "tournaments", id), {
                description: settingsForm.description || "",
                date: settingsForm.date || "",
                callTime: settingsForm.callTime || "",
                venue: settingsForm.venue || "",
                prize: settingsForm.prize || "",
                announcement: settingsForm.announcement || "",
                blindPairing: !!settingsForm.blindPairing,
            });
            toast.success("Tournament settings saved");
            setShowSettings(false);
        } catch { toast.error("Failed to save settings"); }
        finally { setSavingSettings(false); }
    };

    const handleStatusChange = async (status) => {
        try {
            await updateDoc(doc(db, "tournaments", id), { status });
            toast.success(`Status → ${status}`);
        } catch { toast.error("Update failed"); }
    };

    const toggleHidden = async () => {
        if (!tournament) return;
        try {
            await updateDoc(doc(db, "tournaments", id), { hidden: !tournament.hidden });
            toast.success(tournament.hidden ? "Tournament visible on public listing" : "Tournament hidden from public listing");
        } catch { toast.error("Update failed"); }
    };

    const toggleRegistrationClosed = async () => {
        if (!tournament) return;
        try {
            await updateDoc(doc(db, "tournaments", id), {
                registrationClosed: !tournament.registrationClosed
            });
            toast.success(tournament.registrationClosed ? "Registration opened" : "Registration closed");
        } catch { toast.error("Toggle failed"); }
    };

    useEffect(() => {
        setLoading(true);
        const unsubT = onSnapshot(doc(db, "tournaments", id), (docSnap) => {
            if (docSnap.exists()) setTournament({ id: docSnap.id, ...docSnap.data() });
            else navigate("/admin/tournaments");
            setLoading(false);
        });
        const unsubR = onSnapshot(collection(db, "registrations"), (rSnap) => {
            const allRegs = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRegistrations(allRegs.filter(r => r.tournamentId === id));
            
            getDocsCachedFirst(query(collection(db, "players"))).then(pSnap => {
                const dbPlayers = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const existingNames = new Set(dbPlayers.map(p => p.fullName?.toLowerCase().trim()));
                const virtualPlayers = [];
                allRegs.forEach(r => {
                    const p1 = (r.playerName || "").trim();
                    const p2 = (r.partner || "").trim();
                    if (p1 && !existingNames.has(p1.toLowerCase())) {
                        existingNames.add(p1.toLowerCase());
                        virtualPlayers.push({ id: "virt_" + p1, fullName: p1 });
                    }
                    if (p2 && !existingNames.has(p2.toLowerCase())) {
                        existingNames.add(p2.toLowerCase());
                        virtualPlayers.push({ id: "virt_" + p2, fullName: p2 });
                    }
                });
                setAllPlayers([...dbPlayers, ...virtualPlayers]);
            });
        });
        const unsubB = onSnapshot(query(collection(db, "brackets"), where("tournamentId", "==", id)), (bSnap) => {
            const bMap = {};
            bSnap.docs.forEach(d => {
                const b = { id: d.id, ...d.data() };
                if (b.mode) bMap[b.mode] = b;
            });
            setBrackets(bMap);
        });
        return () => { unsubT(); unsubR(); unsubB(); };
    }, [id, navigate]);

    useEffect(() => {
        if (!tournament) return;
        const derivedModes = normalizeModes(tournament, registrations, Object.values(brackets));
        setModes(derivedModes);
        setActiveMode(prev => {
            if (prev && derivedModes.includes(prev)) return prev;
            return derivedModes[0] || "";
        });
    }, [tournament, registrations, brackets]);

    const updateRegStatus = async (regId, status) => {
        try {
            await updateDoc(doc(db, "registrations", regId), { status, reviewedAt: serverTimestamp() });
            setRegistrations(rs => rs.map(r => r.id === regId ? { ...r, status } : r));
            toast.success(`Registration ${status}`);
        } catch { toast.error("Update failed"); }
    };

    const openPaymentModal = (reg) => {
        setViewedPaymentMap(m => ({ ...m, [reg.id]: true }));
        setPaymentModalReg(reg);
    };

    const canConfirmRegistration = (reg) => {
        if (reg.status !== "pending") return true;
        if (!hasPaymentProof(reg)) return false;
        return !!viewedPaymentMap[reg.id];
    };

    const requestConfirmRegistration = (reg) => {
        if (reg.status === "pending" && !hasPaymentProof(reg)) {
            toast.error("Cannot confirm: no GCash payment proof on file.");
            return;
        }
        if (reg.status === "pending" && hasPaymentProof(reg) && !viewedPaymentMap[reg.id]) {
            toast.error('Open "View payment" and verify the receipt before confirming.');
            return;
        }
        updateRegStatus(reg.id, "confirmed");
    };

    const generateBracket = async () => {
        if (!activeMode) {
            toast.error("No tournament mode found. Add at least one mode first.");
            return;
        }
        setGenerating(true);
        try {
            let players = [];
            if (genMode === "blank") {
                const slotsCount = parseInt(blankSlots, 10);
                if (isNaN(slotsCount) || slotsCount < 2) {
                    setGenerating(false);
                    return toast.error("Enter a valid number of slots (min 2)");
                }
                players = Array(slotsCount).fill("TBD");
            } else {
                const confirmed = registrations.filter(r => r.mode === activeMode && r.status === "confirmed");
                if (confirmed.length < 2) {
                    toast.error("Need at least 2 confirmed players");
                    setGenerating(false);
                    setConfirmGen(false);
                    return;
                }
                players = buildBracketSeedsFromRegistrations(confirmed, {
                    blindPairing: tournament.blindPairing,
                });
            }
            const rounds = buildBracket(players, tournament.bestOf || 3, bracketType);
            const data = {
                tournamentId: id,
                tournamentName: tournament.name,
                mode: activeMode,
                bestOf: tournament.bestOf || 3,
                type: bracketType,
                rounds,
                updatedAt: serverTimestamp(),
            };
            if (brackets[activeMode]) {
                await updateDoc(doc(db, "brackets", brackets[activeMode].id), data);
                setBrackets(b => ({ ...b, [activeMode]: { ...brackets[activeMode], ...data } }));
            } else {
                const ref = await addDoc(collection(db, "brackets"), { ...data, createdAt: serverTimestamp() });
                setBrackets(b => ({ ...b, [activeMode]: { id: ref.id, ...data } }));
            }
            setActiveTab("bracket");
            toast.success(`${activeMode} bracket generated!`);
        } catch (e) { console.error(e); toast.error("Generation failed"); }
        finally { setGenerating(false); setConfirmGen(false); }
    };

    const updateScore = (rIdx, mIdx, pIdx, sIdx, val) => {
        const bracket = brackets[activeMode];
        if (!bracket) return;
        const rounds = JSON.parse(JSON.stringify(bracket.rounds));
        const match = rounds[rIdx].matches[mIdx];
        setScoreValue(match, pIdx, sIdx, val === "" ? "" : Number(val));
        setBrackets(b => ({ ...b, [activeMode]: { ...bracket, rounds } }));
    };

    const getPartnerFor = (name) => {
        if (!name) return "";
        const lower = name.toLowerCase();
        const reg = registrations.find(r => 
            (r.playerName || "").toLowerCase() === lower || 
            (r.partner || "").toLowerCase() === lower
        );
        if (!reg) return "";
        if ((reg.playerName || "").toLowerCase() === lower) return reg.partner || "";
        return reg.playerName || "";
    };

    const updatePlayerName = (rIdx, mIdx, pIdx) => {
        const bracket = brackets[activeMode];
        if (!bracket) return;
        const rounds = JSON.parse(JSON.stringify(bracket.rounds));
        const match = rounds[rIdx].matches[mIdx];
        const currentName = pIdx === 0 ? match.player1 : match.player2;
        
        let p1 = currentName === "TBD" ? "" : (currentName || "");
        let p2 = "";
        if (p1.includes(" & ")) {
            const parts = p1.split(" & ");
            p1 = parts[0];
            p2 = parts[1] || "";
        }
        setEditPlayerNode({ rIdx, mIdx, pIdx, p1: p1.trim(), p2: p2.trim() });
        setActiveSuggestField(null);
    };

    const savePlayerName = async () => {
        if (!editPlayerNode) return;
        const { rIdx, mIdx, pIdx, p1, p2 } = editPlayerNode;
        const bracket = brackets[activeMode];
        if (!bracket) return;
        const rounds = JSON.parse(JSON.stringify(bracket.rounds));
        const match = rounds[rIdx].matches[mIdx];

        const p1Trimmed = (p1 || "").trim();
        let p2Trimmed = (p2 || "").trim();
        if (!p2Trimmed && p1Trimmed) p2Trimmed = getPartnerFor(p1Trimmed);

        let finalName = p1Trimmed;
        if (p2Trimmed) finalName += ` & ${p2Trimmed}`;
        if (!finalName) finalName = null;

        if (pIdx === 0) match.player1 = finalName;
        else match.player2 = finalName;

        try {
            await updateDoc(doc(db, "brackets", bracket.id), { rounds, updatedAt: serverTimestamp() });
            setBrackets(b => ({ ...b, [activeMode]: { ...bracket, rounds } }));
            toast.success("Player updated");
            setEditPlayerNode(null);
        } catch { toast.error("Failed to update player"); }
    };

    const determineWinner = async (rIdx, mIdx) => {
        const bracket = brackets[activeMode];
        if (!bracket) return;
        const rounds = JSON.parse(JSON.stringify(bracket.rounds));
        const match = rounds[rIdx].matches[mIdx];
        const setsNeeded = Math.ceil((match.bestOf || 3) / 2);
        const p1Scores = getScoresArray(match, 0);
        const p2Scores = getScoresArray(match, 1);
        const numSets = Math.max(p1Scores.length || 0, p2Scores.length || 0);
        let p1 = 0, p2 = 0;
        for (let s = 0; s < numSets; s++) {
            const s1 = Number(p1Scores[s] || 0);
            const s2 = Number(p2Scores[s] || 0);
            if (s1 > s2) p1++; else if (s2 > s1) p2++;
        }
        if (p1 < setsNeeded && p2 < setsNeeded) {
            toast.error("Enter all set scores — winner not yet determined");
            return;
        }
        const winner = p1 >= setsNeeded ? match.player1 : match.player2;
        match.winner = winner;
        const bracketType = bracket.type || "single_elimination";
        ensureBracketWiring(rounds, bracketType);
        advanceFromMatch(rounds, match, winner, bracketType);
        cascadeByeAdvances(rounds, bracketType);
        try {
            await updateDoc(doc(db, "brackets", bracket.id), { rounds, updatedAt: serverTimestamp() });
            setBrackets(b => ({ ...b, [activeMode]: { ...bracket, rounds } }));
            toast.success(`Winner: ${winner}`);
            
            // Check if this is the final match of the final round
            if (rIdx === rounds.length - 1 && mIdx === 0 && tournament.status !== "completed") {
                const newBracketsState = { ...brackets, [activeMode]: { ...bracket, rounds } };
                const allModesCompleted = modes.length > 0 && modes.every(mode => {
                    const b = newBracketsState[mode];
                    if (!b || !b.rounds || b.rounds.length === 0) return false;
                    const lastRnd = b.rounds[b.rounds.length - 1];
                    return !!lastRnd.matches?.[0]?.winner;
                });

                if (allModesCompleted) {
                    await updateDoc(doc(db, "tournaments", id), { status: "completed" });
                    toast.success("All modes finished! Tournament marked as completed!");
                }
            }
        } catch { toast.error("Save failed"); }
    };

    const saveBracket = async () => {
        const bracket = brackets[activeMode];
        if (!bracket) return;
        try {
            await updateDoc(doc(db, "brackets", bracket.id), { rounds: bracket.rounds, updatedAt: serverTimestamp() });
            toast.success("Scores saved!");
        } catch { toast.error("Save failed"); }
    };

    const deleteBracket = async () => {
        const bracket = brackets[activeMode];
        if (!bracket) return;
        if (!window.confirm(`Are you sure you want to delete the ${activeMode} bracket? All scores will be lost.`)) return;
        try {
            await deleteDoc(doc(db, "brackets", bracket.id));
            const updated = { ...brackets };
            delete updated[activeMode];
            setBrackets(updated);
            toast.success("Bracket deleted");
        } catch { toast.error("Delete failed"); }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center pt-16">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!tournament) return null;

    const modeRegs = (m) => registrations.filter(r => r.mode === m);
    const confirmedRegs = (m) => modeRegs(m).filter(r => r.status === "confirmed");
    const currentBracket = brackets[activeMode];

    return (
        <div className="min-h-screen court-grid pt-20 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="pt-6 mb-6">
                    <button onClick={() => navigate("/admin/tournaments")}
                        className="flex items-center gap-1 text-slate-500 hover:text-white text-sm mb-4 transition-colors">
                        <ChevronLeft size={16} /> Back to Tournaments
                    </button>
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <select value={tournament.status} onChange={e => handleStatusChange(e.target.value)}
                                    className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none bg-transparent capitalize ${tournament.status === "ongoing" ? "border-emerald-500/40 text-emerald-400"
                                        : tournament.status === "completed" ? "border-slate-600 text-slate-400"
                                            : "border-amber-500/40 text-amber-400"}`}>
                                    {STATUSES.map(s => <option key={s} value={s} className="bg-slate-900 capitalize">{s}</option>)}
                                </select>
                                <button onClick={toggleHidden}
                                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${tournament.hidden ? "bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"}`}
                                    title={tournament.hidden ? "Show on public listing" : "Hide from public listing"}>
                                    <EyeOff size={10} /> {tournament.hidden ? "Hidden" : "Public"}
                                </button>
                                <button onClick={toggleRegistrationClosed} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tournament.registrationClosed ? "bg-red-500/20 text-red-400 border-red-500/20 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/30"}`}>
                                    {tournament.registrationClosed ? "Registration: Closed" : "Registration: Open"}
                                </button>
                                {tournament.prize && <span className="badge-gold">{tournament.prize}</span>}
                                {tournament.date && <span className="text-slate-500 text-sm flex items-center gap-1"><Calendar size={13} /> {tournament.date}{tournament.callTime ? ` · ${formatCallTime(tournament.callTime)}` : ""}</span>}
                                {tournament.venue && <span className="text-slate-500 text-sm flex items-center gap-1"><MapPin size={13} /> {tournament.venue}</span>}
                                {tournament.blindPairing && <span className="text-xs px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-400">Blind Pairing</span>}
                            </div>
                            <h1 className="font-display text-4xl tracking-wider text-white">{tournament.name}</h1>
                            <p className="text-slate-400 text-sm mt-1">Best of {tournament.bestOf || 3} &nbsp;·&nbsp; {registrations.length} total registrations</p>
                            {tournament.announcement && (
                                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-xl">
                                    <Megaphone size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-amber-200 text-sm">{tournament.announcement}</p>
                                </div>
                            )}
                        </div>
                        <button onClick={openSettings} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors">
                            <Settings size={15} /> Settings
                        </button>
                    </div>
                </div>

                {/* Mode Pills — grouped */}
                <div className="space-y-3 mb-5">
                    {groupModesForDisplay(modes).map(group => (
                        <div key={group.label}>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">{group.label}</div>
                            <div className="flex gap-2 flex-wrap">
                                {group.modes.map(mode => (
                                    <button key={mode} onClick={() => setActiveMode(mode)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeMode === mode ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${MODE_COLORS[mode] || ""}`}>{mode}</span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeMode === mode ? "bg-slate-950/30" : "bg-slate-700"}`}>
                                            {modeRegs(mode).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {modes.length > 0 && groupModesForDisplay(modes).length === 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {modes.map(mode => (
                                <button key={mode} onClick={() => setActiveMode(mode)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeMode === mode ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                                    {mode}
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeMode === mode ? "bg-slate-950/30" : "bg-slate-700"}`}>
                                        {modeRegs(mode).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {modes.length === 0 && (
                    <div className="mb-5 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
                        This tournament has no modes yet. Add a mode to generate a bracket.
                    </div>
                )}

                {/* Sub Tabs */}
                <div className="flex border-b border-slate-800 mb-6">
                    {["registrations", "bracket"].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${activeTab === tab ? "text-amber-400 border-amber-500" : "text-slate-500 border-transparent hover:text-slate-300"}`}>
                            {tab === "bracket"
                                ? `Bracket${currentBracket ? "" : " (not generated)"}`
                                : `Registrations (${modeRegs(activeMode).length})`}
                        </button>
                    ))}
                </div>

                {/* ── Registrations Tab ── */}
                {activeTab === "registrations" && (
                    <div>
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                            <p className="text-sm text-slate-400">
                                <span className="text-emerald-400 font-medium">{confirmedRegs(activeMode).length} confirmed</span>
                                &nbsp;·&nbsp;
                                {modeRegs(activeMode).filter(r => r.status === "pending").length} pending
                                &nbsp;·&nbsp;
                                {modeRegs(activeMode).filter(r => r.status === "rejected").length} rejected
                            </p>
                            <button onClick={() => setConfirmGen(true)}
                                disabled={confirmedRegs(activeMode).length < 2}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${confirmedRegs(activeMode).length >= 2
                                        ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                                        : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}>
                                <Shuffle size={14} />
                                Generate {activeMode} Bracket
                                {currentBracket && <span className="text-xs opacity-60">(re-generate)</span>}
                            </button>
                        </div>

                        {modeRegs(activeMode).length === 0 ? (
                            <div className="card p-10 text-center">
                                <Users size={32} className="text-slate-700 mx-auto mb-2" />
                                <p className="text-slate-500">No registrations for {activeMode} yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {modeRegs(activeMode)
                                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                                    .map(reg => (
                                        <div key={reg.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap hover:border-amber-500/15 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {reg.playerPhotoDataUrl ? (
                                                    <a href={reg.playerPhotoDataUrl} target="_blank" rel="noopener noreferrer" title="View player photo">
                                                        <img src={reg.playerPhotoDataUrl} alt={reg.playerName} className="w-10 h-10 rounded-xl object-cover border border-slate-600 shrink-0 hover:border-amber-500/50 transition-colors" />
                                                    </a>
                                                ) : (
                                                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0">
                                                        {(reg.playerName?.[0] || "?").toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-white font-medium">{reg.playerName}</div>
                                                    <div className="text-slate-500 text-xs flex flex-wrap gap-2">
                                                        <span>{reg.email}</span>
                                                        {reg.phone && <span>· {reg.phone}</span>}
                                                        {reg.age && <span>· Age {reg.age}</span>}
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
                                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                                <span className={`text-xs px-2.5 py-1 rounded-full border ${reg.status === "confirmed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                                        : reg.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/20"
                                                            : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
                                                    {reg.status}
                                                </span>
                                                {hasPaymentProof(reg) && (
                                                    <button type="button" onClick={() => openPaymentModal(reg)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-medium transition-colors border border-amber-500/20"
                                                        title="View GCash payment proof">
                                                        <ImageIcon size={14} /> View payment
                                                    </button>
                                                )}
                                                {reg.status === "pending" && !hasPaymentProof(reg) && (
                                                    <span className="text-[10px] text-amber-500/80 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/15">No proof</span>
                                                )}
                                                {reg.status !== "confirmed" && (
                                                    <button type="button" onClick={() => requestConfirmRegistration(reg)}
                                                        disabled={!canConfirmRegistration(reg)}
                                                        className={`p-1.5 rounded-lg transition-colors ${canConfirmRegistration(reg)
                                                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                                            : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}
                                                        title={canConfirmRegistration(reg) ? "Confirm" : hasPaymentProof(reg) ? "View payment first" : "Missing payment proof"}>
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                {reg.status !== "rejected" && (
                                                    <button type="button" onClick={() => updateRegStatus(reg.id, "rejected")}
                                                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Reject">
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Bracket Tab ── */}
                {activeTab === "bracket" && (
                    <div>
                        {!currentBracket ? (
                            <div className="card p-12 text-center">
                                <Layers size={36} className="text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium mb-1">No bracket yet for {activeMode}</p>
                                <p className="text-slate-600 text-sm mb-5">Confirm at least 2 players then generate the bracket.</p>
                                <button onClick={() => setActiveTab("registrations")} className="btn-gold inline-flex items-center gap-2">
                                    <Users size={14} /> Review Registrations
                                </button>
                            </div>
                        ) : (
                            <div>
                                {/* Bracket toolbar */}
                                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <span className={`text-xs px-2.5 py-1 rounded-full border ${MODE_COLORS[activeMode] || ""}`}>{activeMode}</span>
                                        <span>Best of {currentBracket.bestOf}</span>
                                        <span>·</span>
                                        <span>{(currentBracket.rounds?.[0]?.matches?.length || 0) * 2} slots seeded</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={saveBracket}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm transition-colors">
                                            <Check size={13} /> Save Scores
                                        </button>
                                        <button onClick={() => setConfirmGen(true)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-sm transition-colors">
                                            <RefreshCw size={13} /> Regenerate
                                        </button>
                                        <button onClick={deleteBracket}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-colors">
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable bracket */}
                                <div className="overflow-x-auto pb-6">
                                    <div className="inline-flex gap-8 items-start">
                                        {(currentBracket.rounds || []).map((round, rIdx) => {
                                            const isTreeLayout = !currentBracket.type || currentBracket.type === "single_elimination";
                                            return (
                                            <div key={rIdx} style={{ minWidth: 230 }}>
                                                {/* Round label */}
                                                <div className="text-center mb-5">
                                                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/15">
                                                        {round.label}
                                                    </span>
                                                </div>

                                                {/* Matches */}
                                                <div className="flex flex-col" style={{
                                                    gap: isTreeLayout ? (rIdx === 0 ? 12 : `${(Math.pow(2, rIdx) - 1) * 72 + (Math.pow(2, rIdx) - 2) * 12}px`) : 12,
                                                    paddingTop: isTreeLayout ? (rIdx === 0 ? 0 : `${(Math.pow(2, rIdx - 1) - 0.5) * 72 + (Math.pow(2, rIdx - 1) - 1) * 12 + 6}px`) : 0,
                                                }}>
                                                    {round.matches.map((match, mIdx) => {
                                                        const isBye = match.player1 === "BYE" || match.player2 === "BYE";
                                                        return (
                                                            <div key={mIdx}
                                                                className={`rounded-xl border overflow-hidden ${match.winner ? "border-amber-500/50" : "border-slate-700"}`}
                                                                style={{ width: 226 }}>
                                                                {[0, 1].map(pi => {
                                                                    const playerName = pi === 0 ? match.player1 : match.player2;
                                                                    const isWinner = match.winner === playerName;
                                                                    return (
                                                                        <div key={pi}
                                                                            className={`flex items-center justify-between px-3 py-2.5 ${pi === 0 ? "border-b border-slate-800" : ""} ${isWinner ? "bg-amber-500/10" : "bg-slate-900"}`}>
                                                                            <span onClick={() => updatePlayerName(rIdx, mIdx, pi)} className={`text-sm font-medium truncate flex-1 mr-1 cursor-pointer hover:underline ${isWinner ? "text-amber-400" : playerName && playerName !== "TBD" ? "text-white" : "text-slate-600"}`} title="Click to edit player">
                                                                                {isWinner && ""}{playerName || "TBD"}
                                                                            </span>
                                                                            <div className="flex gap-0.5 shrink-0">
                                                                                {Array.from({ length: match.bestOf || 3 }).map((_, si) => (
                                                                                    <input key={si} type="number" min="0" max="99"
                                                                                        className="w-7 h-7 text-center text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500 p-0 disabled:opacity-30"
                                                                                        value={getScoresArray(match, pi)[si] ?? ""}
                                                                                        onChange={e => updateScore(rIdx, mIdx, pi, si, e.target.value)}
                                                                                        disabled={isBye || !match.player1 || !match.player2 || !!match.winner}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {/* Action row */}
                                                                {!match.winner && !isBye && match.player1 && match.player2 && (
                                                                    <button onClick={() => determineWinner(rIdx, mIdx)}
                                                                        className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-colors border-t border-slate-800">
                                                                        Set Winner →
                                                                    </button>
                                                                )}
                                                                {match.winner && (
                                                                    <div className="w-full py-1.5 text-center text-xs text-emerald-400 bg-emerald-500/5 border-t border-slate-800">
                                                                        ✓ Match complete
                                                                    </div>
                                                                )}
                                                                {isBye && (
                                                                    <div className="w-full py-1.5 text-center text-xs text-slate-600 border-t border-slate-800">
                                                                        BYE — auto advance
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )})}

                                        {/* Champion card */}
                                        {(() => {
                                            const lastRound = currentBracket.rounds?.[currentBracket.rounds.length - 1];
                                            const champion = lastRound?.matches?.[0]?.winner;
                                            if (!champion) return null;
                                            return (
                                                <div className="flex flex-col items-center" style={{ paddingTop: 40 }}>
                                                    <div className="text-center mb-5">
                                                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/15">
                                                            Champion
                                                        </span>
                                                    </div>
                                                    <div className="card p-6 border-amber-500/50 text-center shadow-2xl shadow-amber-500/10" style={{ width: 180 }}>
                                                        <div className="text-5xl mb-3"></div>
                                                        <div className="text-amber-400 font-semibold text-sm leading-tight">{champion}</div>
                                                        <div className="text-slate-500 text-xs mt-1">{activeMode} Champion</div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="mt-3 p-3.5 bg-slate-800/50 rounded-xl text-slate-500 text-xs leading-relaxed">
                                    Enter scores for each set → click <strong className="text-slate-400">Set Winner →</strong> to advance the winner to the next round. Click <strong className="text-slate-400">Save Scores</strong> to persist changes to Firebase.
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Confirm Generate Modal */}
            <PaymentProofModal
                open={!!paymentModalReg}
                url={paymentModalReg ? getPaymentProofSrc(paymentModalReg) : ""}
                title={paymentModalReg ? `GCash proof — ${paymentModalReg.playerName}` : ""}
                onClose={() => setPaymentModalReg(null)}
            />

            {confirmGen && (
                <div className="fixed inset-0 modal-bg z-50 flex items-center justify-center px-4">
                    <div className="card p-6 max-w-sm w-full border-amber-500/15">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                                <Shuffle size={18} className="text-amber-400" />
                            </div>
                            <h3 className="text-white font-semibold">Generate {activeMode} Bracket?</h3>
                        </div>
                        <div className="mb-4">
                            <label className="label">Generation Mode</label>
                            <div className="flex gap-2 mb-3">
                                <button onClick={() => setGenMode("auto")} className={`flex-1 py-2 rounded-xl text-sm transition-colors border ${genMode === "auto" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}>Auto-fill</button>
                                <button onClick={() => setGenMode("blank")} className={`flex-1 py-2 rounded-xl text-sm transition-colors border ${genMode === "blank" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}>Blank</button>
                            </div>
                            
                            {genMode === "blank" ? (
                                <div className="mb-4">
                                    <label className="label">Number of Slots</label>
                                    <input type="number" min="2" className="input-field" value={blankSlots} onChange={e => setBlankSlots(e.target.value)} />
                                </div>
                            ) : (
                                <div className="mb-4 space-y-2">
                                    <p className="text-slate-400 text-sm">
                                        Generating using <strong className="text-white">{confirmedRegs(activeMode).length} confirmed players</strong>.
                                    </p>
                                    {tournament.blindPairing && (
                                        <p className="text-purple-300 text-xs p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                            Blind pairing is on — solo players will be randomly paired into teams.
                                        </p>
                                    )}
                                </div>
                            )}

                            <label className="label">Bracket Type</label>
                            <select className="input-field" value={bracketType} onChange={e => setBracketType(e.target.value)}>
                                <option value="single_elimination">Single Elimination</option>
                                <option value="double_elimination">Double Elimination</option>
                                <option value="round_robin">Round Robin</option>
                            </select>
                        </div>
                        {currentBracket && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                                <AlertCircle size={14} className="text-red-400 shrink-0" />
                                <p className="text-red-400 text-xs">Existing bracket + all scores will be overwritten.</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmGen(false)} className="btn-dark flex-1 py-2.5 text-sm">Cancel</button>
                            <button onClick={generateBracket} disabled={generating}
                                className="btn-gold flex-1 py-2.5 text-sm flex items-center justify-center gap-1">
                                {generating ? "Generating..." : <><Shuffle size={13} /> Generate</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSettings && settingsForm && (
                <div className="fixed inset-0 modal-bg z-50 flex items-start justify-center px-4 py-8 overflow-y-auto">
                    <div className="card p-6 max-w-md w-full border-amber-500/15 my-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-white font-semibold flex items-center gap-2"><Settings size={18} className="text-amber-400" /> Tournament Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Description</label>
                                <textarea rows={2} className="input-field resize-none" placeholder="Brief description..."
                                    value={settingsForm.description}
                                    onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label">Date</label>
                                    <input type="date" className="input-field" value={settingsForm.date}
                                        onChange={e => setSettingsForm({ ...settingsForm, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label flex items-center gap-1"><Clock size={12} className="text-amber-400" /> Call Time</label>
                                    <input type="time" className="input-field" value={settingsForm.callTime}
                                        onChange={e => setSettingsForm({ ...settingsForm, callTime: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="label">Venue</label>
                                <input type="text" className="input-field" placeholder="e.g. PickleZone Hall"
                                    value={settingsForm.venue}
                                    onChange={e => setSettingsForm({ ...settingsForm, venue: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Prize</label>
                                <input type="text" className="input-field" placeholder="e.g. ₱10,000"
                                    value={settingsForm.prize}
                                    onChange={e => setSettingsForm({ ...settingsForm, prize: e.target.value })} />
                            </div>
                            <div>
                                <label className="label flex items-center gap-1"><Megaphone size={12} className="text-amber-400" /> Extra Announcement</label>
                                <textarea rows={2} className="input-field resize-none" placeholder="e.g. Best Outfit wins a prize!"
                                    value={settingsForm.announcement}
                                    onChange={e => setSettingsForm({ ...settingsForm, announcement: e.target.value })} />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-700 bg-slate-800/40">
                                <input type="checkbox" checked={settingsForm.blindPairing}
                                    onChange={e => setSettingsForm({ ...settingsForm, blindPairing: e.target.checked })}
                                    className="w-4 h-4 rounded accent-amber-500" />
                                <div>
                                    <div className="text-white text-sm font-medium">Blind Pairing</div>
                                    <div className="text-slate-500 text-xs">Random partner assignment at bracket generation</div>
                                </div>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowSettings(false)} className="btn-dark flex-1 py-2.5 text-sm">Cancel</button>
                            <button onClick={saveSettings} disabled={savingSettings} className="btn-gold flex-1 py-2.5 text-sm">
                                {savingSettings ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editPlayerNode && (
                <div className="fixed inset-0 modal-bg z-50 flex items-center justify-center px-4">
                    <div className="card p-6 max-w-sm w-full border-amber-500/15">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold">Assign Pair</h3>
                            <button onClick={() => setEditPlayerNode(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                        </div>
                        
                        <div className="relative mb-4">
                            <label className="label">Player 1 (Type BYE for BYE)</label>
                            <input type="text" className="input-field" autoFocus placeholder="e.g. John Doe"
                                value={editPlayerNode.p1}
                                onChange={(e) => {
                                    const newP1 = e.target.value;
                                    setEditPlayerNode(prev => {
                                        const next = { ...prev, p1: newP1 };
                                        const p2Fill = getPartnerFor(newP1.trim());
                                        if (p2Fill && !prev.p2.trim()) next.p2 = p2Fill;
                                        return next;
                                    });
                                    setActiveSuggestField("p1");
                                }}
                                onFocus={() => setActiveSuggestField("p1")}
                                onBlur={() => setTimeout(() => {
                                    setActiveSuggestField(f => f === "p1" ? null : f);
                                    setEditPlayerNode(prev => {
                                        const p2Fill = getPartnerFor(prev.p1.trim());
                                        if (p2Fill && !prev.p2.trim()) return { ...prev, p2: p2Fill };
                                        return prev;
                                    });
                                }, 200)}
                            />
                            {activeSuggestField === "p1" && editPlayerNode.p1 && (
                                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {allPlayers
                                        .filter(p => p.fullName?.toLowerCase().includes(editPlayerNode.p1.toLowerCase()))
                                        .map(p => (
                                            <div key={p.id}
                                                className="px-4 py-2 hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    const p2Fill = getPartnerFor(p.fullName);
                                                    setEditPlayerNode(prev => ({
                                                        ...prev,
                                                        p1: p.fullName,
                                                        p2: prev.p2.trim() ? prev.p2 : (p2Fill || prev.p2),
                                                    }));
                                                    setActiveSuggestField(null);
                                                }}>
                                                {p.photoDataUrl ? (
                                                    <img src={p.photoDataUrl} alt={p.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-600" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
                                                        {(p.fullName?.[0] || "?").toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-white text-sm">{p.fullName}</span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className="relative mb-6">
                            <label className="label">Player 2 (Optional)</label>
                            <input type="text" className="input-field" placeholder="e.g. Jane Smith"
                                value={editPlayerNode.p2}
                                onChange={(e) => {
                                    setEditPlayerNode(prev => ({ ...prev, p2: e.target.value }));
                                    setActiveSuggestField("p2");
                                }}
                                onFocus={() => setActiveSuggestField("p2")}
                                onBlur={() => setTimeout(() => setActiveSuggestField(f => f === "p2" ? null : f), 200)}
                            />
                            {activeSuggestField === "p2" && editPlayerNode.p2 && (
                                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {allPlayers
                                        .filter(p => p.fullName?.toLowerCase().includes(editPlayerNode.p2.toLowerCase()))
                                        .map(p => (
                                            <div key={p.id}
                                                className="px-4 py-2 hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setEditPlayerNode(prev => ({ ...prev, p2: p.fullName }));
                                                    setActiveSuggestField(null);
                                                }}>
                                                {p.photoDataUrl ? (
                                                    <img src={p.photoDataUrl} alt={p.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-600" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
                                                        {(p.fullName?.[0] || "?").toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-white text-sm">{p.fullName}</span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={() => setEditPlayerNode(null)} className="btn-dark flex-1 py-2.5 text-sm">Cancel</button>
                            <button onClick={savePlayerName} className="btn-gold flex-1 py-2.5 text-sm">Save Pair</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}