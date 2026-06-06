import { MAX_PAYMENT_DATA_URL_CHARS } from "./registrationImages";

/** Max file size before encoding (user-facing cap). */
const MAX_INPUT_BYTES = 1024 * 1024; // 1 MB

/** Capped so player + partner + payment images fit in one Firestore document. */
const MAX_DATA_URL_CHARS = MAX_PAYMENT_DATA_URL_CHARS;

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function loadImageElement(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not read image"));
        };
        img.src = objectUrl;
    });
}

/**
 * Encode payment screenshot as a JPEG data URL sized for Firestore.
 * @param {File} file
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export async function encodePaymentImageForFirestore(file) {
    if (!file || !(file instanceof File)) throw new Error("No file selected");
    if (!ALLOWED.has(file.type)) throw new Error("Please upload a JPG, PNG, or WebP image");
    if (file.size > MAX_INPUT_BYTES) throw new Error("Image must be 1 MB or smaller");

    const img = await loadImageElement(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let maxSide = Math.max(img.naturalWidth, img.naturalHeight);
    let scale = maxSide > 1920 ? 1920 / maxSide : 1;
    let w = Math.max(1, Math.round(img.naturalWidth * scale));
    let h = Math.max(1, Math.round(img.naturalHeight * scale));

    const tryEncode = () => {
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let q = 0.88;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length > MAX_DATA_URL_CHARS && q > 0.38) {
            q -= 0.06;
            dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        return dataUrl;
    };

    let dataUrl = tryEncode();
    let guard = 0;
    while (dataUrl.length > MAX_DATA_URL_CHARS && guard < 12 && w > 280 && h > 280) {
        w = Math.round(w * 0.88);
        h = Math.round(h * 0.88);
        dataUrl = tryEncode();
        guard++;
    }

    if (dataUrl.length > MAX_DATA_URL_CHARS) {
        throw new Error("Image is still too large after compression; use a smaller photo.");
    }
    return dataUrl;
}

export function getPaymentProofSrc(reg) {
    if (!reg) return "";
    return reg.paymentProofDataUrl || reg.paymentProofUrl || "";
}

export function hasPaymentProof(reg) {
    return !!getPaymentProofSrc(reg);
}
