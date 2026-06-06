import { X, ExternalLink } from "lucide-react";

export default function PaymentProofModal({ open, url, title, onClose }) {
    if (!open || !url) return null;

    return (
        <div className="fixed inset-0 modal-bg z-[60] flex items-center justify-center px-4 py-8" role="dialog" aria-modal="true">
            <div className="card p-4 max-w-lg w-full max-h-[90vh] flex flex-col border-amber-500/20">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-white font-semibold text-sm truncate">{title || "GCash payment proof"}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                        <a href={url} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700 transition-colors" title="Open in new tab">
                            <ExternalLink size={16} />
                        </a>
                        <button type="button" onClick={onClose} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors" aria-label="Close">
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-1 min-h-0 flex items-center justify-center">
                    <img src={url} alt="GCash payment proof" className="max-w-full max-h-[70vh] object-contain" />
                </div>
                <p className="text-slate-500 text-xs mt-3">Verify the amount and reference before confirming this registration.</p>
            </div>
        </div>
    );
}
