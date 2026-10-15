import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, size = "max-w-md", z = "z-[60]", closeOnEsc = true }) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 ${z} flex items-end justify-center bg-black/50 sm:items-center sm:p-4`} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full ${size} overflow-y-auto rounded-t-3xl bg-white p-6 text-left sm:rounded-3xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}