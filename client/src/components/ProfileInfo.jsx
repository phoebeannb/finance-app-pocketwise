import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { resizeToDataUrl } from "../utils/imageResize";
import PasswordStrength from "./PasswordStrength";
import PasswordInput from "./PasswordInput";
import { checkPassword } from "../utils/passwordPolicy";
import { toast } from "../utils/toast";
import { Block, Row, Actions, inputClass, primaryBtn } from "./SettingsUI";

export default function ProfileInfo() {
  const { user, updateUser } = useAuth();
  const start = { name: user?.name || "", email: user?.email || "", profilePhoto: user?.profilePhoto || "" };
  const [profile, setProfile] = useState(start);
  const [original, setOriginal] = useState(start);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api.get("/profile").then(({ data }) => {
      const p = { name: data.name, email: data.email, profilePhoto: data.profilePhoto || "" };
      setProfile(p);
      setOriginal(p);
    }).catch(() => {});
  }, []);

  const profileDirty = profile.name.trim() !== original.name || profile.email.trim().toLowerCase() !== original.email;
  const photoChanged = profile.profilePhoto !== original.profilePhoto;

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put("/profile", profile);
      const p = { ...profile, name: data.user.name, email: data.user.email, profilePhoto: data.user.profilePhoto || profile.profilePhoto };
      updateUser(p);
      setProfile(p);
      setOriginal(p);
    } catch { /* the red message explains what to fix */ } finally {
      setSavingProfile(false);
    }
  };

  const choosePhoto = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const image = await resizeToDataUrl(file, 500, 0.82);
      setProfile((current) => ({ ...current, profilePhoto: image }));
    } catch {
      // The image helper rejects unreadable files; the browser keeps the current photo.
    }
  };

  const savePhoto = async (image = profile.profilePhoto) => {
    setSavingPhoto(true);
    try {
      const { data } = await api.put("/profile/photo", { image }, { quiet: true });
      const next = { ...profile, profilePhoto: data.profilePhoto || "" };
      updateUser({ profilePhoto: next.profilePhoto });
      setProfile(next);
      setOriginal(next);
    } catch (err) {
      toast.error(err.response?.data?.message || "The profile photo could not be saved.");
    } finally {
      setSavingPhoto(false);
    }
  };

  const removePhoto = () => savePhoto("");

  const rulesOk = checkPassword(pw.next, { email: profile.email, name: profile.name }).every((r) => r.ok);
  const mismatch = pw.confirm && pw.next !== pw.confirm;
  const canSavePw = pw.current && rulesOk && pw.next === pw.confirm;
  const pwHint = !pw.current ? ""
    : !rulesOk ? "Your new password doesn't meet every rule in the checklist yet."
    : pw.next !== pw.confirm ? "The two new passwords need to match." : "";

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
        <Block title="Account" description="">
          <Row label="Profile photo">
            <div className="flex items-center gap-4">
              {profile.profilePhoto
                ? <img src={profile.profilePhoto} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700">{profile.name.charAt(0).toUpperCase() || "?"}</div>}
              <div>
                <label className={`${primaryBtn} inline-flex cursor-pointer`}>
                  Choose photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="sr-only" />
                </label>
                {profile.profilePhoto && <button type="button" onClick={removePhoto} disabled={savingPhoto} className="ml-2 text-sm font-medium text-red-700 hover:underline disabled:opacity-50">Remove photo</button>}
                {photoChanged && <button type="button" onClick={savePhoto} disabled={savingPhoto} className="ml-2 text-sm font-medium text-indigo-700 hover:underline disabled:opacity-50">{savingPhoto ? "Saving..." : "Save photo"}</button>}
                <p className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP.</p>
              </div>
            </div>
          </Row>
          <Row label="Name">
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required className={inputClass} />
          </Row>
          <Row label="Email address">
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required className={inputClass} />
          </Row>
        </Block>
        <Actions>
          <button type="submit" disabled={!profileDirty || savingProfile} className={primaryBtn}>{savingProfile ? "Saving..." : "Save Changes"}</button>
        </Actions>
        {}
      </form>

      <form onSubmit={savePassword} className="mt-10">
        <Block title="Password" description="">
          <Row label="Current password">
            <PasswordInput value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" className={inputClass} />
          </Row>
          <Row label="New password">
            <PasswordInput value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" className={inputClass} />
            <div className="mt-3"><PasswordStrength password={pw.next} email={profile.email} name={profile.name} /></div>
          </Row>
          <Row label="Confirm new password">
            <PasswordInput value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" className={inputClass} />
            {mismatch && <p className="mt-1 text-sm text-red-700">The two passwords don't match yet.</p>}
          </Row>
        </Block>
        <Actions>
          <button type="submit" disabled={!canSavePw || savingPw} className={primaryBtn}>{savingPw ? "Updating..." : "Update password"}</button>
        </Actions>
        {!canSavePw && pwHint && <p className="mt-2 text-right text-sm text-slate-600">{pwHint}</p>}
      </form>
    </div>
  );
}