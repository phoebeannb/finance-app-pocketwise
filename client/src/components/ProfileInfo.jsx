import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import PasswordStrength from "./PasswordStrength";
import { checkPassword } from "../utils/passwordPolicy";

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

export default function ProfileInfo() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ name: user.name || "", email: user.email || "" });
  const [profileMsg, setProfileMsg] = useState({ ok: "", err: "" });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState({ ok: "", err: "" });

  useEffect(() => {
    api.get("/profile").then(({ data }) => setProfile({ name: data.name, email: data.email })).catch(() => {});
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ ok: "", err: "" });
    try {
      const { data } = await api.put("/profile", profile);
      updateUser({ name: data.user.name, email: data.user.email });
      setProfileMsg({ ok: "Profile updated", err: "" });
    } catch (err) {
      setProfileMsg({ ok: "", err: err.response?.data?.message || "Something went wrong" });
    }
  };

  const passwordOk =
    checkPassword(pw.next, { email: profile.email, name: profile.name }).every((r) => r.ok) &&
    pw.next === pw.confirm;

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ ok: "", err: "" });
    try {
      await api.put("/profile/password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ ok: "Password updated", err: "" });
    } catch (err) {
      setPwMsg({ ok: "", err: err.response?.data?.message || "Something went wrong" });
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={saveProfile} className="h-fit space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Profile Info</h3>
        {profileMsg.ok && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{profileMsg.ok}</p>}
        {profileMsg.err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{profileMsg.err}</p>}
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required className={field} />
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required className={field} />
        <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">Save profile</button>
      </form>

      <form onSubmit={savePassword} className="h-fit space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Change password</h3>
        {pwMsg.ok && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{pwMsg.ok}</p>}
        {pwMsg.err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{pwMsg.err}</p>}
        <input type="password" placeholder="Current password" value={pw.current}
          onChange={(e) => setPw({ ...pw, current: e.target.value })} required className={field} />
        <input type="password" placeholder="New password" value={pw.next}
          onChange={(e) => setPw({ ...pw, next: e.target.value })} required className={field} />
        <PasswordStrength password={pw.next} email={profile.email} name={profile.name} />
        <input type="password" placeholder="Confirm new password" value={pw.confirm}
          onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required className={field} />
        {pw.confirm && pw.next !== pw.confirm && <p className="text-sm text-red-600">Passwords do not match</p>}
        <button type="submit" disabled={!passwordOk}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          Update password
        </button>
      </form>
    </div>
  );
}