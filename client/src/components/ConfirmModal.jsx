import { useState } from "react";
import Modal from "./Modal";

export default function ConfirmModal({ open, title = "Are you sure?", message, confirmLabel = "Delete", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* keep the popup open if it failed */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="max-w-sm" z="z-[70]">
      <p className="mb-5 text-slate-600">{message}</p>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-medium hover:bg-slate-200">Cancel</button>
        <button onClick={run} disabled={busy}
          className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {busy ? "..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}