import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="grid min-h-screen bg-white text-left lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-2 text-2xl font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">₱</span>
          PocketWise
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight">
            Know where your money goes.
          </h2>
          <p className="mt-4 max-w-md text-indigo-100">
            Track income and expenses, see your savings rate, and keep your
            spending under control, all in one place.
          </p>
        </div>
        <p className="relative text-sm text-indigo-200">© PocketWise</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-slate-500">Log in to your PocketWise account</p>
          </div>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input name="email" type="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} required className={input} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input name="password" type="password" placeholder="••••••••"
                value={form.password} onChange={handleChange} required className={input} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="text-center text-sm text-slate-500">
            No account yet?{" "}
            <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}