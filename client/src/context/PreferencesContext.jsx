import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { setCurrency } from "../utils/format";
import { setDateFormat } from "../utils/datetime";

const DEFAULTS = { currency: "PHP", dateFormat: "medium", defaultAccount: null, reportRange: 6 };
const KEY = "pw_prefs";

const readStored = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return DEFAULTS;
  }
};
const apply = (p) => {
  setCurrency(p.currency);
  setDateFormat(p.dateFormat);
};

const PreferencesContext = createContext({ prefs: DEFAULTS, save: async () => false });

export function PreferencesProvider({ children }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(() => {
    const p = readStored();
    apply(p); // applied before the first render, so there's no flash of the wrong currency
    return p;
  });
  const [version, setVersion] = useState(0);
  const prefsRef = useRef(prefs);

  // Returns true when the currency or date format changed (the screen redraws once so every number updates)
  const commit = useCallback((next) => {
    const prev = prefsRef.current;
    prefsRef.current = next;
    localStorage.setItem(KEY, JSON.stringify(next));
    apply(next);
    setPrefs(next);
    const changed = prev.currency !== next.currency || prev.dateFormat !== next.dateFormat;
    if (changed) setVersion((v) => v + 1);
    return changed;
  }, []);

  useEffect(() => {
    if (!user?.id) {
      commit(DEFAULTS);
      localStorage.removeItem(KEY);
      return;
    }
    let cancelled = false;
    api.get("/profile/preferences")
      .then(({ data }) => { if (!cancelled) commit({ ...DEFAULTS, ...data }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, commit]);

  const save = useCallback(async (patch) => {
    const { data } = await api.put("/profile/preferences", patch);
    return commit({ ...DEFAULTS, ...data });
  }, [commit]);

  return (
    <PreferencesContext.Provider value={{ prefs, save }}>
      <Fragment key={version}>{children}</Fragment>
    </PreferencesContext.Provider>
  );
}

export const usePrefs = () => useContext(PreferencesContext);