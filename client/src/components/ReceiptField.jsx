import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import api from "../api/axios";
import { resizeToDataUrl } from "../utils/imageResize";
import { toast } from "../utils/toast";

const btn = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";

// state: { status: "none" | "existing" | "new" | "removed", data? }
export default function ReceiptField({ txId, state, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(null); // photo already saved on this transaction, once opened

  const pick = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange({ status: "new", data: await resizeToDataUrl(file) });
      setShown(null);
    } catch {
      toast.error("That file isn't a photo we can read. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  };

  const openExisting = async () => {
    setBusy(true);
    try {
      const { data } = await api.get(`/transactions/${txId}/receipt`);
      setShown(data.image);
    } catch {
      toast.error("We couldn't load that photo. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const picture = state.status === "new" ? state.data : state.status === "existing" ? shown : null;

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />
      {(state.status === "none" || state.status === "removed") && (
        <button type="button" onClick={() => inputRef.current.click()} disabled={busy} className={`${btn} inline-flex items-center gap-2`}>
          <Paperclip size={16} aria-hidden="true" /> {busy ? "Preparing photo..." : "Attach a receipt photo"}
        </button>
      )}
      {state.status === "removed" && <p className="mt-1 text-xs text-slate-600">The current photo will be removed when you save.</p>}
      {(state.status === "new" || state.status === "existing") && (
        <div className="flex flex-wrap items-start gap-3">
          {picture && <img src={picture} alt="Receipt photo" className="h-24 w-20 rounded-md border border-slate-200 object-cover" />}
          <div className="space-y-2">
            <p className="text-sm text-slate-700">{state.status === "new" ? "Photo ready. It's saved when you save." : "A receipt photo is attached."}</p>
            <div className="flex flex-wrap gap-2">
              {state.status === "existing" && !shown && <button type="button" onClick={openExisting} disabled={busy} className={btn}>{busy ? "Loading..." : "View"}</button>}
              <button type="button" onClick={() => inputRef.current.click()} disabled={busy} className={btn}>Replace</button>
              <button type="button" onClick={() => { onChange({ status: state.status === "new" && txId ? "existing" : "removed" }); setShown(null); }}
                className={`${btn} text-red-700`}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}