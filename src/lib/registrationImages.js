/**
 * Firestore documents are limited to ~1 MiB total.
 * Pair registration stores 3 base64 images on one doc:
 *   player photo + partner photo + GCash proof
 * Keep per-image caps so all three fit with room for text fields.
 */
export const FIRESTORE_DOC_LIMIT_CHARS = 1024 * 1024;
export const REGISTRATION_TEXT_RESERVE_CHARS = 48 * 1024;

/** Max stored data URL length per profile photo (~200 KB) */
export const MAX_PROFILE_DATA_URL_CHARS = 200 * 1024;

/** Max stored data URL length for payment proof (~380 KB) */
export const MAX_PAYMENT_DATA_URL_CHARS = 380 * 1024;

export function estimateRegistrationDocChars(reg) {
    return JSON.stringify(reg).length;
}

export function validateRegistrationDocSize(reg) {
    const size = estimateRegistrationDocChars(reg);
    const limit = FIRESTORE_DOC_LIMIT_CHARS - 16 * 1024;
    if (size > limit) {
        throw new Error(
            `Registration is too large (${Math.round(size / 1024)} KB). ` +
            "Use smaller photos or lower resolution — Firestore allows ~1 MB per registration."
        );
    }
    return size;
}

export function getRegistrationImageBudgetLabel(needsPartner) {
    if (needsPartner) {
        return "Pair registration saves 3 photos (you, partner, payment). Keep each image under 2 MB — they are compressed automatically.";
    }
    return "Your photo and payment screenshot are compressed automatically before saving.";
}
