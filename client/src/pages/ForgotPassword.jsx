import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-reset-code", { email, code });
      window.location.assign(`/reset-password/${data.token}`);
    } catch (err) {
      setError(err.response?.data?.message || "That code could not be verified.");
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <form onSubmit={sent ? verifyCode : handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-lg shadow-slate-200/50 sm:p-8">
        <div><p className="text-sm font-semibold text-indigo-600">Account recovery</p><h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">{sent ? "Check your email" : "Forgot your password?"}</h1><p className="mt-2 text-sm text-slate-600">{sent ? "Enter the six-digit code we sent you." : "We’ll send a secure reset code to your account email."}</p></div>
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-slate-700">Email address</label>
          <input id="forgot-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
        </div>
        {sent && <div><label htmlFor="forgot-code" className="mb-1 block text-sm font-medium text-slate-700">Reset code</label><input id="forgot-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required className="w-full rounded-xl border border-slate-300 px-3 py-3 text-center text-2xl tracking-[.45em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></div>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">{loading ? "Please wait..." : sent ? "Verify code" : "Send reset code"}</button>
        <p className="text-center text-sm text-slate-600"><Link to="/login" className="font-medium text-indigo-700 hover:underline">Back to log in</Link></p>
      </form>
    </AuthLayout>
  );
}