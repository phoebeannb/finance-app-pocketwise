import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Modal from "./Modal";
import { TableCard } from "./ui";

const EXPORTS = [
  ["transactions", "Transactions", "CSV", "csv", "Every income, expense and transfer"],
  ["accounts", "Accounts", "CSV", "csv", "Your accounts and their starting balances"],
  ["goals", "Savings goals", "CSV", "csv", "Targets and how much is saved"],
  ["all", "Everything", "JSON", "json", "A full backup of all your data"],
];

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function DataPrivacy() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const [delOpen, setDelOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [delError, setDelError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const download = async (what, ext) => {
    setBusy(what);
    setError("");
    try {
      const { data } = await api.get(`/profile/export/${what}`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pocketwise-${what}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't prepare that file. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const openDelete = () => { setPassword(""); setConfirmText(""); setDelError(""); setDelOpen(true); };

  const submitDelete = async (e) => {
    e.preventDefault();
    setDelError("");
    setDeleting(true);
    try {
      await api.delete("/profile", { data: { password } });
      logout(); // sends you back to the login page
    } catch (err) {
      setDelError(err.response?.data?.message || "Something went wrong");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <h3 className="text-lg font-semibold">Export Data</h3>
        {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <TableCard>
          <table className="data-table">
            <thead><tr><th>Data</th><th>What's in it</th><th>Format</th><th className="actions" /></tr></thead>
            <tbody>
              {EXPORTS.map(([what, name, format, ext, desc]) => (
                <tr key={what}>
                  <td className="font-medium">{name}</td>
                  <td className="text-slate-600">{desc}</td>
                  <td className="text-slate-500">{format}</td>
                  <td className="actions">
                    <button onClick={() => download(what, ext)} disabled={!!busy}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                      <Download size={14} /> {busy === what ? "Preparing..." : "Download"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </section>

      <section className="rounded-lg border border-red-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-red-700">Delete my account</h3>
        <p className="mt-1 text-sm text-slate-600">
          Permanently removes your account and everything in it. This can't be undone, so download a backup first.
        </p>
        <button onClick={openDelete}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
          <Trash2 size={16} /> Delete my account...
        </button>
      </section>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete your account" size="max-w-md">
        <form onSubmit={submitDelete} className="space-y-3">
          {delError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{delError}</p>}
          <p className="text-sm text-slate-600">This permanently deletes your:</p>
          <ul className="list-inside list-disc text-sm text-slate-600">
            <li>Accounts and cards</li>
            <li>Transactions and imports</li>
            <li>Budgets, goals, bills and categories</li>
            <li>Login. You'll need to register again to use PocketWise.</li>
          </ul>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Your password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type DELETE to confirm</label>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={field} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setDelOpen(false)} className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={deleting || !password || confirmText !== "DELETE"}
              className="flex-1 rounded-lg bg-red-600 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting..." : "Delete everything"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}