export const ALL_MODES = [
    "Low Novice Men",
    "Low Novice Women",
    "High Novice Men",
    "High Novice Women",
    "Intermediate Men",
    "Intermediate Mix",
    "Novice Mix",
];

export const MODE_COLORS = {
    "Low Novice Men": "bg-blue-500/15 text-blue-400 border-blue-500/20",
    "Low Novice Women": "bg-pink-500/15 text-pink-400 border-pink-500/20",
    "High Novice Men": "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    "High Novice Women": "bg-purple-500/15 text-purple-400 border-purple-500/20",
    "Intermediate Men": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    "Intermediate Mix": "bg-amber-500/15 text-amber-400 border-amber-500/20",
    "Novice Mix": "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

export const MODE_GROUPS = [
    { label: "Men's Division", subtitle: "Singles", modes: ["Low Novice Men", "High Novice Men", "Intermediate Men"] },
    { label: "Women's Division", subtitle: "Singles", modes: ["Low Novice Women", "High Novice Women"] },
    { label: "Mixed Doubles", subtitle: "Partner required", modes: ["Novice Mix", "Intermediate Mix"] },
];

export function groupModesForDisplay(modes) {
    const set = new Set(modes || []);
    return MODE_GROUPS
        .map(g => ({ ...g, modes: g.modes.filter(m => set.has(m)) }))
        .filter(g => g.modes.length > 0);
}

export function modeRequiresPartner(mode) {
    return /Mix/i.test(mode || "");
}

export function registrationNeedsPartner(tournament, selectedMode) {
    if (tournament?.blindPairing) return false;
    return modeRequiresPartner(selectedMode);
}

export function getPairingLabel(tournament) {
    if (tournament?.blindPairing) return "Blind pairing — register solo, partners assigned randomly";
    if ((tournament?.modes || []).some(modeRequiresPartner)) return "Register with your partner";
    return "Solo registration";
}

export function shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function buildBracketSeedsFromRegistrations(confirmed, { blindPairing } = {}) {
    if (blindPairing) {
        const names = confirmed.map(r => (r.playerName || "").trim()).filter(Boolean);
        const shuffled = shuffleArr(names);
        const seeds = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) seeds.push(`${shuffled[i]} & ${shuffled[i + 1]}`);
            else seeds.push(shuffled[i]);
        }
        return seeds;
    }
    return confirmed.map(r =>
        r.partner ? `${r.playerName} & ${r.partner}` : r.playerName
    );
}

export function isTournamentVisibleToUsers(tournament) {
    return !tournament?.hidden;
}

export function formatCallTime(callTime) {
    if (!callTime) return "";
    const [h, m] = callTime.split(":");
    const hour = parseInt(h, 10);
    if (isNaN(hour)) return callTime;
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m || "00"} ${ampm}`;
}
