import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import PasswordStrength from "../components/PasswordStrength";
import PasswordInput from "../components/PasswordInput";
import { checkPassword } from "../utils/passwordPolicy";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rulesOk = checkPassword(password).every((r) => r.ok);
  const matches = password === confirm;
  const hint = !rulesOk
    ? (password ? "Meet every rule in the checklist to continue." : "Choose a new password to continue.")
    : !matches ? "The two passwords need to match." : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-left sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Set a new password</h1>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <label htmlFor="rp-new" className="mb-1 block text-sm font-medium text-slate-700">New password</label>
          <PasswordInput id="rp-new" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} />
        </div>
        <PasswordStrength password={password} />
        <div>
          <label htmlFor="rp-confirm" className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
          <PasswordInput id="rp-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={input} />
        </div>

        <button type="submit" disabled={!rulesOk || !matches || saving} aria-describedby={hint ? "rp-hint" : undefined}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Updating..." : "Update password"}
        </button>
        {hint && <p id="rp-hint" className="text-sm text-slate-600">{hint}</p>}

        <p className="text-center text-sm"><Link to="/login" className="text-indigo-700 hover:underline">Back to log in</Link></p>
      </form>
    </div>
  );
}