import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "calc(100% - 2rem)", maxWidth: 360, margin: "clamp(32px, 10vh, 80px) auto 0", display: "grid", gap: 12 }}>
      <h2>Forgot password</h2>
      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
        <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required
          style={{ minWidth: 0 }} />
      <button type="submit">Send reset link</button>
      <p><Link to="/login">Back to log in</Link></p>
    </form>
  );
}