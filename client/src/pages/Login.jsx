import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import AuthLayout from "../components/AuthLayout";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-xl shadow-slate-200/60 sm:p-8">
          <div><p className="text-sm font-semibold text-indigo-600">Welcome back</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">Log in to PocketWise</h1><p className="mt-2 text-sm text-slate-600">Pick up where you left off.</p></div>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input id="login-email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} required className={input} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-sm text-indigo-700 hover:underline">Forgot Password?</Link>
            </div>
            <PasswordInput id="login-password" name="password" autoComplete="current-password" value={form.password} onChange={handleChange} required className={input} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p className="text-center text-sm text-slate-600">
            No account yet? <Link to="/register" className="font-medium text-indigo-700 hover:underline">Create Account </Link>
          </p>
        </form>
    </AuthLayout>
  );
}