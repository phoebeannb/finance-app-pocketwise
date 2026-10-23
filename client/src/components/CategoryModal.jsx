import { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "./Modal";

export default function CategoryModal({ open, type, existing = [], parents = [], onClose, onCreated }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [parent, setParent] = useState("");

  useEffect(() => {
    if (open) { setName(""); setParent(""); setError(""); }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setError("Enter a category name");
    if (existing.some((c) => c.toLowerCase() === clean.toLowerCase()))
      return setError("That category already exists");
    setSaving(true);
    try {
      const { data } = await api.post("/categories", { name: clean, type, parent });
      onCreated(data.name);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`New ${type} category`} size="max-w-sm" z="z-[70]">
      <form onSubmit={submit} className="space-y-3">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={30}
          placeholder="e.g. Pets, Gym, Online classes"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
        {parents.length > 0 && (
          <select value={parent} onChange={(e) => setParent(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100">
            <option value="">Top-level category</option>
            {parents.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <button type="submit" disabled={saving}
          className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving..." : "Create category"}
        </button>
      </form>
    </Modal>
  );
}