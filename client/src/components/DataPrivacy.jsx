import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "../utils/toast";
import Modal from "./Modal";
import { Block, Row, inputClass, secondaryBtn } from "./SettingsUI";

const EXPORTS = [
  ["transactions", "Transactions", "Export all income, expenses, and transfers to a CSV file.", "csv"],
  ["accounts", "Accounts", "Export your accounts and opening balances to a CSV file.", "csv"],
  ["goals", "Savings Goals", "Export your savings targets and current progress to a CSV file.", "csv"],
  ["all", "Full backup", "Download a complete backup of your data, including transactions, accounts, budgets, bills, subscriptions, savings goals, and categories in JSON format.", "json"],
];

export default function DataPrivacy() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState("");

  const [delOpen, setDelOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const download = async (what, ext) => {
    setBusy(what);
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
      toast.success("Your file is downloading.");
    } catch {
      toast.error("We couldn't prepare that file. Check that the server is running and try again.");
    } finally {
      setBusy("");
    }
  };

  const openDelete = () => { setPassword(""); setConfirmText(""); setDelOpen(true); };

  const submitDelete = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.delete("/profile", { data: { password } });
      logout(); // sends you back to the login page
    } catch {
      setDeleting(false); // the red message says why (for example, a wrong password)
    }
  };

  return (
    <div>
      <Block title="Export Data" description="Download a copy of your financial data for your records or use in other applications.">
        {EXPORTS.map(([what, name, desc, ext]) => (
          <Row key={what} label={name} hint={desc}>
            <button onClick={() => download(what, ext)} disabled={!!busy} className={secondaryBtn}>
              {busy === what ? "Preparing..." : `Download .${ext}`}
            </button>
          </Row>
        ))}
      </Block>

        <Row label="Delete Account" hint="This can't be undone. Download a backup first.">
          <button onClick={openDelete}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Delete Account
          </button>
        </Row>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete your account" size="max-w-md">
        <form onSubmit={submitDelete} className="space-y-3">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete your account? Your accounts, transactions, budgets, goals, bills and categories will be permanently removed.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Your password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type DELETE to confirm</label>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={inputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setDelOpen(false)} className={`flex-1 ${secondaryBtn}`}>Cancel</button>
            <button type="submit" disabled={deleting || !password || confirmText !== "DELETE"}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting..." : "Delete everything"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}