import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { subscribe, dismiss, toast } from "../utils/toast";

export default function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => subscribe(setItems), []);

  // Shown after the app sends you back to the login page because your session ended
  useEffect(() => {
    const notice = sessionStorage.getItem("pw_notice");
    if (notice) {
      sessionStorage.removeItem("pw_notice");
      toast.error(notice);
    }
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:w-96">
      {items.map((t) => {
        const ok = t.type === "success";
        return (
          <div key={t.id} role={ok ? "status" : "alert"}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-md px-4 py-3 text-sm text-white shadow-lg ${ok ? "bg-green-600" : "bg-red-600"}`}>
            {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 rounded p-0.5 hover:bg-white/20">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}