import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import PasswordStrength from "./PasswordStrength";
import { checkPassword } from "../utils/passwordPolicy";
import { Block, Row, Actions, inputClass, primaryBtn } from "./SettingsUI";

export default function ProfileInfo() {
  const { user, updateUser } = useAuth();
  const start = { name: user?.name || "", email: user?.email || "" };
  const [profile, setProfile] = useState(start);
  const [original, setOriginal] = useState(start);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api.get("/profile").then(({ data }) => {
      const p = { name: data.name, email: data.email };
      setProfile(p);
      setOriginal(p);
    }).catch(() => {});
  }, []);

  const profileDirty = profile.name.trim() !== original.name || profile.email.trim().toLowerCase() !== original.email;

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put("/profile", profile);
      const p = { name: data.user.name, email: data.user.email };
      updateUser(p);
      setProfile(p);
      setOriginal(p);
    } catch { /* the red message explains what to fix */ } finally {
      setSavingProfile(false);
    }
  };

  const rulesOk = checkPassword(pw.next, { email: profile.email, name: profile.name }).every((r) => r.ok);
  const mismatch = pw.confirm && pw.next !== pw.confirm;
  const canSavePw = pw.current && rulesOk && pw.next === pw.confirm;

  const savePassword = async (e) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      await api.put("/profile/password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
    } catch { /* the red message explains what to fix */ } finally {
      setSavingPw(false);
    }
  };

  return (
    <div>
      <form onSubmit={saveProfile}>
        <Block title="Account" description="This is how you appear in PocketWise and how you log in.">
          <Row label="Name">
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required className={inputClass} />
          </Row>
          <Row label="Email address" hint="Used to log in and to reset your password.">
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required className={inputClass} />
          </Row>
        </Block>
        <Actions>
          <button type="submit" disabled={!profileDirty || savingProfile} className={primaryBtn}>{savingProfile ? "Saving..." : "Save changes"}</button>
        </Actions>
      </form>

      <form onSubmit={savePassword} className="mt-10">
        <Block title="Password" description="Choose a strong password you don't use anywhere else.">
          <Row label="Current password">
            <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" className={inputClass} />
          </Row>
          <Row label="New password">
            <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" className={inputClass} />
            <div className="mt-3"><PasswordStrength password={pw.next} email={profile.email} name={profile.name} /></div>
          </Row>
          <Row label="Confirm new password">
            <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" className={inputClass} />
            {mismatch && <p className="mt-1 text-sm text-red-600">The two passwords don't match yet.</p>}
          </Row>
        </Block>
        <Actions>
          <button type="submit" disabled={!canSavePw || savingPw} className={primaryBtn}>{savingPw ? "Updating..." : "Update password"}</button>
        </Actions>
      </form>
    </div>
  );
}