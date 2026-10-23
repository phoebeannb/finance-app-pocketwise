import { useState } from "react";
import api from "../api/axios";
import { toast } from "../utils/toast";
import Modal from "./Modal";
import MoodPicker from "./MoodPicker";

export default function MoodPrompt({ transactionId, onClose }) {
  const [mood, setMood] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!mood) return onClose();
    setSaving(true);
    try {
      await api.patch(`/transactions/${transactionId}/mood`, { mood });
      toast.success("Mood saved.");
      onClose();
    } catch {
      toast.error("The transaction was saved, but the mood could not be added.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!transactionId} onClose={onClose} title="How were you feeling?">
      <p className="mb-4 text-sm text-slate-600">Add a mood to help you understand your spending patterns. This is optional.</p>
      <MoodPicker value={mood} onChange={setMood} />
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-slate-100 py-2.5 font-medium hover:bg-slate-200">Skip</button>
        <button type="button" onClick={save} disabled={saving} className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving..." : "Save mood"}
        </button>
      </div>
    </Modal>
  );
}
