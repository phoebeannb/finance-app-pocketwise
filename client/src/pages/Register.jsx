import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordStrength from "../components/PasswordStrength";
import PasswordInput from "../components/PasswordInput";
import { checkPassword } from "../utils/passwordPolicy";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordOk = checkPassword(form.password, { email: form.email, name: form.name }).every((r) => r.ok);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/setup");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-left sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Create Account</h1>
          <p className="mt-1 text-sm text-slate-600">Start tracking with PocketWise</p>
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input id="reg-name" name="name" autoComplete="name" value={form.name} onChange={handleChange} required className={input} />
        </div>
        <div>
          <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input id="reg-email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} required className={input} />
        </div>
        <div>
          <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <PasswordInput id="reg-password" name="password" autoComplete="new-password" value={form.password} onChange={handleChange} required className={input} />
        </div>

        <PasswordStrength password={form.password} email={form.email} name={form.name} />

        <button type="submit" disabled={!passwordOk || loading} aria-describedby={!passwordOk ? "reg-hint" : undefined}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Creating..." : "Register"}
        </button>
        {!passwordOk && (
          <p id="reg-hint" className="text-sm text-slate-600">
            {form.password ? "Meet every rule in the checklist above to create your account." : ""}
          </p>
        )}

        <p className="text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-medium text-indigo-700 hover:underline">Log In</Link>
        </p>
      </form>
    </div>
  );
}