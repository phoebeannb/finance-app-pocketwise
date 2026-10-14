import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import PasswordStrength from "../components/PasswordStrength";
import { checkPassword } from "../utils/passwordPolicy";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const passwordOk = checkPassword(password).every((r) => r.ok);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match");
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 360, margin: "80px auto", display: "grid", gap: 12 }}>
      <h2>Set a new password</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      <button type="submit" disabled={!passwordOk}>
        Update password
      </button>
      <p><Link to="/login">Back to log in</Link></p>
      <PasswordStrength password={password} />
    </form>
  );
}