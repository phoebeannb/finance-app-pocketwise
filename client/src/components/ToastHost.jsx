import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { subscribe, dismiss, toast } from "../utils/toast";

export default function ToastHost() {
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);

  useEffect(() => subscribe((list) => { itemsRef.current = list; setItems(list); }), []);

  // Shown after the app sends you back to the login page because your session ended
  useEffect(() => {
    const notice = sessionStorage.getItem("pw_notice");
    if (notice) {
      sessionStorage.removeItem("pw_notice");
      toast.error(notice);
    }
  }, []);

  // Ctrl+Z (or Cmd+Z) takes back the most recent delete
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const el = e.target;
      if (el && (["INPUT", "TEXTAREA"].includes(el.tagName) || el.isContentEditable)) return;
      const last = [...itemsRef.current].reverse().find((t) => t.action);
      if (last) {
        e.preventDefault();
        dismiss(last.id);
        last.action.onClick();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:w-96">
      {items.map((t) => {
        const ok = t.type === "success";
        return (
          <div key={t.id} role={ok ? "status" : "alert"}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-md px-4 py-3 text-sm text-white shadow-lg ${ok ? "bg-green-600" : "bg-red-600"}`}>
            {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button onClick={() => { dismiss(t.id); t.action.onClick(); }}
                className="shrink-0 rounded border border-white/80 px-2.5 py-0.5 font-semibold hover:bg-white/20">
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 rounded p-0.5 hover:bg-white/20">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}