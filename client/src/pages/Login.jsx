import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

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
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-zinc-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-950"><Wallet size={17} aria-hidden="true" /></span>
          PocketWise
        </div>
        <p className="max-w-sm text-2xl font-semibold leading-snug">
          Keep track of your income, expenses, bills and savings in one place.
        </p>
        <p className="text-sm text-zinc-400">© PocketWise</p>
      </div>

      <div className="flex items-center justify-center bg-[#f4f5f7] p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-left sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Log In</h1>

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
      </div>
    </div>
  );
}