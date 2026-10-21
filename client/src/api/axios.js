import axios from "axios";
import { toast } from "../utils/toast";
import { formatMoney } from "../utils/format";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function txAdded(d) {
  const base = d?.type === "income" ? "Income added." : d?.type === "transfer" ? "Transfer Added." : "Expense Added.";
  return d?.autoSaved > 0 ? `${base} ${formatMoney(d.autoSaved)} was moved to your savings Goals.` : base;
}

// [method, address pattern, message]. A function builds the message from the response; returning nothing stays quiet.
const SUCCESS = [
  ["post", /^\/auth\/login$/, "Welcome back!"],
  ["post", /^\/auth\/register$/, "Account created. Welcome to PocketWise!"],
  ["post", /^\/auth\/forgot-password$/, (d) => d?.message],
  ["post", /^\/auth\/reset-password\//, "Password updated. You can log in now."],

  ["post", /^\/transactions$/, txAdded],
  ["put", /^\/transactions\/[^/]+$/, "Transaction updated."],
  ["delete", /^\/transactions\/[^/]+$/, "Transaction deleted."],

  ["post", /^\/accounts$/, "Account created."],
  ["put", /^\/accounts\/[^/]+$/, "Account updated."],
  ["delete", /^\/accounts\/[^/]+$/, "Account deleted."],

  ["post", /^\/budgets$/, "Budget added."],
  ["put", /^\/budgets\/[^/]+$/, "Budget updated."],
  ["delete", /^\/budgets\/[^/]+$/, "Budget deleted."],

  ["post", /^\/goals$/, "Goal created."],
  ["put", /^\/goals\/[^/]+$/, "Goal updated."],
  ["post", /^\/goals\/[^/]+\/funds$/, "Withdrawal recorded."],
  ["delete", /^\/goals\/[^/]+$/, "Goal deleted. Anything saved went back to your accounts."],

  ["post", /^\/categories$/, "Category added."],
  ["put", /^\/categories\/[^/]+$/, "Category renamed."],
  ["delete", /^\/categories\/[^/]+$/, "Category deleted."],

  ["post", /^\/recurring$/, "Bill added."],
  ["put", /^\/recurring\/[^/]+$/, "Bill updated."],
  ["delete", /^\/recurring\/[^/]+$/, "Bill deleted."],
  ["post", /^\/recurring\/[^/]+\/toggle$/, (d) => (d?.active ? "Bill resumed." : "Bill paused.")],
  ["post", /^\/recurring\/[^/]+\/skip$/, "Next due date skipped."],

  ["post", /^\/import\/suggest$/, () => null],
  ["post", /^\/import\/commit$/, (d) =>
    `${plural(d?.imported ?? 0, "transaction")} imported.${d?.skippedDuplicates ? ` ${plural(d.skippedDuplicates, "duplicate")} skipped.` : ""}`],
  ["delete", /^\/rules\/[^/]+$/, "Rule deleted."],

  ["put", /^\/profile$/, "Profile updated."],
  ["put", /^\/profile\/password$/, "Password changed."],
  ["put", /^\/profile\/preferences$/, "Preferences saved."],
  ["delete", /^\/profile$/, "Your account was deleted."],
];

function successMessage(method, url, data) {
  for (const [m, pattern, msg] of SUCCESS) {
    if (m === method && pattern.test(url)) return typeof msg === "function" ? msg(data) : msg;
  }
  return method === "delete" ? "Deleted." : "Saved.";
}

const FIELD = {
  amount: "amount", category: "category", name: "name", limit: "monthly limit", target: "target amount",
  date: "date", type: "type", email: "email", password: "password", nextDate: "next due date", cadence: "how often it repeats",
};

// Turns whatever went wrong into a sentence that says what to do next
function friendly(err) {
  if (!err.response) {
    return err.code === "ECONNABORTED"
      ? "The request took too long. Please try again."
      : "Can't reach the server. Check that it's running and that you're online.";
  }
  const { status, data } = err.response;
  const raw = typeof data?.message === "string" ? data.message : "";

  if (status === 413) return "That file is too large. Please use a smaller one.";
  if (status === 429) return raw || "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";

  const missing = [...raw.matchAll(/Path `(\w+)` is required/g)].map((m) => FIELD[m[1]] || m[1]);
  if (missing.length) return `Please fill in: ${missing.join(", ")}.`;
  const tooLow = raw.match(/Path `(\w+)` \(([^)]*)\) is less than minimum allowed value \(([^)]*)\)/);
  if (tooLow) return `The ${FIELD[tooLow[1]] || tooLow[1]} must be at least ${tooLow[3]}.`;

  if (!raw || /validation failed|cast to|E11000|duplicate key/i.test(raw)) {
    return status === 404
      ? "That item no longer exists. Refresh the page and try again."
      : "Some details are missing or invalid. Please check the form and try again.";
  }
  return raw;
}

// Extra request options:  { quiet: true } = no message,  { successMessage: "..." } = your own wording
api.interceptors.response.use(
  (res) => {
    const cfg = res.config || {};
    const method = (cfg.method || "get").toLowerCase();
    if (method !== "get" && !cfg.quiet) {
      const msg = cfg.successMessage || successMessage(method, (cfg.url || "").split("?")[0], res.data);
      if (msg) toast.success(msg);
    }
    return res;
  },
  (err) => {
    const cfg = err.config || {};
    const method = (cfg.method || "get").toLowerCase();
    const url = (cfg.url || "").split("?")[0];

    // Session ended: go back to the login page and say why
    if (err.response?.status === 401 && !url.startsWith("/auth/")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.setItem("pw_notice", "Your session expired. Please log in again.");
      window.location.assign("/login");
      return Promise.reject(err);
    }

    // Page loads show their own "try again" bar, and the login forms show their own text,
    // so the red message covers everything you DO (add, edit, delete, save)
    if (method !== "get" && !cfg.quiet && !url.startsWith("/auth/")) toast.error(friendly(err));
    return Promise.reject(err);
  }
);

export default api;