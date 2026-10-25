import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, children, size = "max-w-md", z = "z-[60]", closeOnEsc = true }) {
  const panel = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onClose]);

  // Move focus in when it opens, give it back when it closes, and stop the page scrolling behind it
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const p = panel.current;
      if (p && !p.contains(document.activeElement)) (p.querySelector(FOCUSABLE) || p).focus();
    }, 0);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
      if (previous && previous.focus && document.contains(previous)) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  // Tab and Shift+Tab loop inside the window instead of wandering onto the page behind it
  const trapTab = (e) => {
    if (e.key !== "Tab" || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (items.length === 0) { e.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div
      className={`fixed inset-0 ${z} flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] sm:items-center sm:p-4`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={`max-h-[92vh] w-full ${size} overflow-y-auto rounded-t-2xl border border-slate-200/80 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-left shadow-2xl outline-none sm:max-h-[90vh] sm:rounded-2xl sm:p-6`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id={titleId} className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}