import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle2, X, AlertTriangle, Download } from "lucide-react";
import api from "../api/axios";
import Modal from "./Modal";
import useCategories from "../hooks/useCategories";
import { formatMoney } from "../utils/format";
import { fmtDateTime } from "../utils/datetime";
import { detectColumns, buildRows, deriveKeyword } from "../utils/csvImport";
import { downloadCsvTemplate } from "../utils/csvTemplate";

const MAX_ROWS = 1000;
const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";
const small = "w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-500";
const GRID = "grid grid-cols-[28px_92px_1fr_110px_190px] gap-2";

function Col({ label, hint, value, onChange, headers, required }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={field}>
        <option value="">{required ? "Choose a column" : "(none)"}</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function ImportModal({ open, onClose, onImported }) {
  const [step, setStep] = useState("pick"); // pick | map | preview | done
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [raw, setRaw] = useState([]);
  const [map, setMap] = useState({ date: "", description: "", amount: "", debit: "", credit: "" });
  const [dateFmt, setDateFmt] = useState("auto");
  const [positiveIsExpense, setPositiveIsExpense] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState("");
  const [rows, setRows] = useState([]);
  const [unreadable, setUnreadable] = useState(0);
  const [remember, setRemember] = useState(true);
  const [skipRules, setSkipRules] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const { expense, income, reload } = useCategories();
  const fileRef = useRef();

  useEffect(() => {
    if (!open) return;
    setStep("pick"); setError(""); setFileName(""); setHeaders([]); setRaw([]); setRows([]);
    setResult(null); setRemember(true); setSkipRules(new Set()); setBusy(false);
    setDateFmt("auto"); setPositiveIsExpense(false);
    reload();
    api.get("/accounts").then(({ data }) => {
      setAccounts(data);
      setAccount(data[0]?._id || "");
    }).catch(() => {});
  }, [open, reload]);

  const handleFile = (file) => {
    if (!file) return;
    setError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const fields = (res.meta.fields || []).filter(Boolean);
        if (!fields.length || !res.data.length)
          return setError("That file looks empty. Is it a CSV with a header row on the first line?");
        if (res.data.length > MAX_ROWS)
          return setError(`This file has ${res.data.length} rows. Import up to ${MAX_ROWS} at a time, so split it by month.`);
        setFileName(file.name);
        setHeaders(fields);
        setRaw(res.data);
        setMap(detectColumns(fields));
        setStep("map");
      },
      error: () => setError("Couldn't read that file."),
    });
  };

  const sample = useMemo(
    () => (raw.length ? buildRows(raw.slice(0, 5), map, { dateFmt, positiveIsExpense }).rows[0] : null),
    [raw, map, dateFmt, positiveIsExpense]
  );
  const canContinue = map.date && map.description && (map.amount || map.debit || map.credit);

  const goPreview = async () => {
    setError("");
    setBusy(true);
    try {
      const built = buildRows(raw, map, { dateFmt, positiveIsExpense });
      if (!built.rows.length) {
        setError("Couldn't read any rows with these settings. Check the date column, the date format, and the amount columns.");
        return;
      }
      const { data } = await api.post("/import/suggest", {
        rows: built.rows.map(({ date, description, amount, type }) => ({ date, description, amount, type })),
      });
      setRows(built.rows.map((r, i) => {
        const s = data.suggestions[i];
        return { ...r, category: s.category, suggested: s.category, source: s.source, duplicate: s.duplicate, include: !s.duplicate };
      }));
      setUnreadable(built.unreadable);
      setStep("preview");
    } catch (err) {
      setError(err.response?.data?.message || "Can't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  // Changing one row also fills other still-uncategorized rows from the same merchant
  const setCategory = (id, category) =>
    setRows((rs) => {
      const target = rs.find((r) => r.id === id);
      const kw = target ? deriveKeyword(target.description) : "";
      return rs.map((r) => {
        if (r.id === id) return { ...r, category, source: "you" };
        if (kw && category && r.type === target.type && !r.category && deriveKeyword(r.description) === kw)
          return { ...r, category, source: "you" };
        return r;
      });
    });
  const toggle = (id) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, include: !r.include } : r)));
  const toggleAll = (v) => setRows((rs) => rs.map((r) => ({ ...r, include: v })));

  const optionsFor = (r) => {
    const base = r.type === "income" ? income : expense;
    return r.category && !base.some((c) => c.toLowerCase() === r.category.toLowerCase()) ? [r.category, ...base] : base;
  };

  const selected = rows.filter((r) => r.include);
  const dupCount = rows.filter((r) => r.duplicate).length;

  const pending = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      if (!r.include || !r.category || r.category === r.suggested) continue;
      const kw = deriveKeyword(r.description);
      if (kw) m.set(`${r.type}|${kw}`, { key: `${r.type}|${kw}`, type: r.type, keyword: kw, category: r.category });
    }
    return [...m.values()];
  }, [rows]);
  const toSave = remember ? pending.filter((p) => !skipRules.has(p.key)) : [];

  const flipRule = (key) =>
    setSkipRules((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const doImport = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/import/commit", {
        account: account || null,
        rows: selected.map((r) => ({
          date: r.date, description: r.description, amount: r.amount, type: r.type,
          category: r.category, force: r.duplicate,
        })),
        remember: toSave.map(({ type, keyword, category }) => ({ type, keyword, category })),
      });
      setResult(data);
      setStep("done");
      onImported?.();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const titles = { pick: "Import from CSV", map: "Match your columns", preview: "Review before importing", done: "Import finished" };

  return (
    <Modal open={open} onClose={onClose} title={titles[step]} size={step === "preview" ? "max-w-4xl" : "max-w-lg"}>
      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {step === "pick" && (
        <div>
          <button type="button" onClick={() => fileRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-4 py-10 text-indigo-700 hover:bg-indigo-100">
            <Upload size={32} />
            <span className="font-semibold">Upload CSV File</span>
            <span className="text-sm text-indigo-600/80">or Drop Here</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }} />
          <ul className="mt-4 space-y-1 text-sm text-slate-500">
         <button type="button" onClick={downloadCsvTemplate}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-medium hover:bg-slate-200">
            <Download size={16} /> Download CSV Template
          </button>
          <ul className="mt-4 space-y-1 text-sm text-slate-500">
            <li>• Keep the template’s column headers in the first row.</li>
            <li>• Use YYYY-MM-DD dates.</li>
            <li>• Import up to 1,000 rows at a time.</li>
          </ul>
          </ul>
        </div>
      )}

      {step === "map" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{fileName}</span> · {raw.length} rows. We guessed the columns, so check them.
          </p>
          <Col label="Date" value={map.date} onChange={(v) => setMap({ ...map, date: v })} headers={headers} required />
          <Col label="Description" value={map.description} onChange={(v) => setMap({ ...map, description: v })} headers={headers} required />
          <Col label="Amount" value={map.amount} onChange={(v) => setMap({ ...map, amount: v })} headers={headers}
            hint="Use this if money in and out share one column. Leave empty if you have separate columns below." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Col label="Money out (debit)" value={map.debit} onChange={(v) => setMap({ ...map, debit: v })} headers={headers} />
            <Col label="Money in (credit)" value={map.credit} onChange={(v) => setMap({ ...map, credit: v })} headers={headers} />
          </div>

          {map.amount && !map.debit && !map.credit && (
            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={positiveIsExpense} onChange={(e) => setPositiveIsExpense(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-600" />
              <span>Positive amounts are expenses <span className="text-slate-500">(common on credit card statements)</span></span>
            </label>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date format</label>
            <select value={dateFmt} onChange={(e) => setDateFmt(e.target.value)} className={field}>
              <option value="auto">Auto-detect</option>
              <option value="mdy">Month/Day/Year (10/25/2026)</option>
              <option value="dmy">Day/Month/Year (25/10/2026)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Add these to account</label>
            <select value={account} onChange={(e) => setAccount(e.target.value)} className={field}>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              <option value="">Don't link to an account</option>
            </select>
            <p className="mt-1 flex gap-1 text-xs text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Imported entries change this account's balance (starting balance + transactions). If you already typed in today's
              balance as the starting balance, choose “Don't link”, or lower the starting balance first.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">First row reads as</div>
            {sample ? (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{fmtDateTime(sample.date)} · {sample.description || "—"}</span>
                <span className={`shrink-0 font-semibold ${sample.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {sample.type === "income" ? "+" : "-"}{formatMoney(sample.amount)}
                </span>
              </div>
            ) : (
              <span className="text-slate-500">Nothing readable yet. Pick the columns above.</span>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setStep("pick")} className="rounded-xl bg-slate-100 px-4 py-2.5 font-medium hover:bg-slate-200">Back</button>
            <button type="button" onClick={goPreview} disabled={!canContinue || busy}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? "Reading..." : "Continue"}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            <span className="font-medium">{rows.length}</span> rows read
            {dupCount > 0 && <> · <span className="font-medium text-red-600">{dupCount} already imported</span> (unchecked)</>}
            {unreadable > 0 && <> · {unreadable} couldn't be read and were left out</>}
            . Fix any categories, then import.
          </p>

          <div className="max-h-[42vh] overflow-auto rounded-xl border border-slate-200">
            <div className="min-w-175">
              <div className={`${GRID} sticky top-0 z-10 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500`}>
                <input type="checkbox" checked={selected.length === rows.length} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />
                <span>Date</span><span>Description</span><span className="text-right">Amount</span><span>Category</span>
              </div>
              {rows.map((r) => (
                <div key={r.id} className={`${GRID} items-center border-t border-slate-100 px-3 py-1.5 text-sm ${r.include ? "" : "opacity-50"}`}>
                  <input type="checkbox" checked={r.include} onChange={() => toggle(r.id)} aria-label="Include row" />
                  <span className="text-slate-500">{fmtDateTime(r.date)}</span>
                  <span className="min-w-0">
                    <span className="block truncate" title={r.description}>{r.description || "—"}</span>
                    {r.duplicate && <span className="text-xs font-medium text-red-600">Already imported</span>}
                  </span>
                  <span className={`text-right font-medium ${r.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {r.type === "income" ? "+" : "-"}{formatMoney(r.amount)}
                  </span>
                  <div>
                    <select value={r.category} onChange={(e) => setCategory(r.id, e.target.value)} className={small}>
                      <option value="">Uncategorized</option>
                      {optionsFor(r).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {r.source === "rule" && r.category === r.suggested && <span className="text-xs text-indigo-600">remembered</span>}
                    {r.source === "auto" && r.category === r.suggested && <span className="text-xs text-amber-600">suggested</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pending.length > 0 && (
            <div className="rounded-xl bg-indigo-50 p-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2 font-medium text-indigo-900">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                Remember my category choices for next time
              </label>
              {remember && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pending.map((p) => {
                    const off = skipRules.has(p.key);
                    return (
                      <span key={p.key} className={`flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs ${off ? "line-through opacity-40" : ""}`}>
                        “{p.keyword}” → {p.category}
                        <button type="button" onClick={() => flipRule(p.key)} aria-label="Toggle this rule" className="text-slate-400 hover:text-slate-700">
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("map")} className="rounded-xl bg-slate-100 px-4 py-2.5 font-medium hover:bg-slate-200">Back</button>
            <button type="button" onClick={doImport} disabled={busy || selected.length === 0}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? "Importing..." : `Import ${selected.length} transaction${selected.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="py-4 text-center">
          <CheckCircle2 size={52} className="mx-auto text-green-600" />
          <h4 className="mt-3 text-xl font-semibold">{result.imported} transaction{result.imported === 1 ? "" : "s"} imported</h4>
          <p className="mt-1 text-sm text-slate-500">
            {result.skippedDuplicates > 0 && `${result.skippedDuplicates} duplicate${result.skippedDuplicates === 1 ? "" : "s"} skipped. `}
            {result.invalid > 0 && `${result.invalid} row${result.invalid === 1 ? "" : "s"} had problems and were left out. `}
            {result.rulesSaved > 0 && `${result.rulesSaved} rule${result.rulesSaved === 1 ? "" : "s"} saved for next time.`}
          </p>
          <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">Done</button>
        </div>
      )}
    </Modal>
  );
}