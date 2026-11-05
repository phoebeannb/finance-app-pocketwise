import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordStrength from "../components/PasswordStrength";
import PasswordInput from "../components/PasswordInput";
import AuthLayout from "../components/AuthLayout";
import { checkPassword } from "../utils/passwordPolicy";

const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordOk = checkPassword(form.password, { email: form.email, name: form.name }).every((rule) => rule.ok);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try { await register(form.name, form.email, form.password); navigate("/setup"); }
    catch (err) { setError(err.response?.data?.message || "Something went wrong. Check your connection and try again."); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-xl shadow-slate-200/60 sm:p-8">
        <div><p className="text-sm font-semibold text-indigo-600">Get started</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">Create your account</h1><p className="mt-2 text-sm text-slate-600">A clearer view of your money starts here.</p></div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div><label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-slate-700">Name</label><input id="reg-name" name="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={input} /></div>
        <div><label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label><input id="reg-email" name="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={input} /></div>
        <div><label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-slate-700">Password</label><PasswordInput id="reg-password" name="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className={input} /></div>
        <PasswordStrength password={form.password} email={form.email} name={form.name} />
        <button type="submit" disabled={!passwordOk || loading} className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Creating..." : "Create account"}</button>
        <p className="text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-indigo-700 hover:underline">Log in</Link></p>
      </form>
    </AuthLayout>
  );
}
