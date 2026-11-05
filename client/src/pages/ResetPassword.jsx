import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import PasswordStrength from "../components/PasswordStrength";
import PasswordInput from "../components/PasswordInput";
import AuthLayout from "../components/AuthLayout";
import { checkPassword } from "../utils/passwordPolicy";

const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const rulesOk = checkPassword(password).every((rule) => rule.ok);
  const matches = password === confirm;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try { await api.post(`/auth/reset-password/${token}`, { password }); navigate("/login"); }
    catch (err) { setError(err.response?.data?.message || "Something went wrong. Check your connection and try again."); }
    finally { setSaving(false); }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-xl shadow-slate-200/60 sm:p-8">
        <div><p className="text-sm font-semibold text-indigo-600">Almost there</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">Set a new password</h1><p className="mt-2 text-sm text-slate-600">Choose a strong password you have not used before.</p></div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div><label htmlFor="rp-new" className="mb-1 block text-sm font-medium text-slate-700">New password</label><PasswordInput id="rp-new" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} /></div>
        <PasswordStrength password={password} />
        <div><label htmlFor="rp-confirm" className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label><PasswordInput id="rp-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={input} /></div>
        <button type="submit" disabled={!rulesOk || !matches || saving} className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Updating..." : "Update password"}</button>
        {password && !matches && <p className="text-sm text-amber-700">The passwords need to match.</p>}
        <p className="text-center text-sm"><Link to="/login" className="font-medium text-indigo-700 hover:underline">Back to log in</Link></p>
      </form>
    </AuthLayout>
  );
}
