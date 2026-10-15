import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { fmtDate, fmtDateTime } from "../utils/datetime";
import { txTitle } from "../utils/txDisplay";
import Modal from "./Modal";
import TxIcon from "./TxIcon";

const LIABILITIES = ["Credit Card", "Loan"];

export default function AccountDetails({ account, onClose, onEdit }) {
  const [txs, setTxs] = useState(null);

  useEffect(() => {
    if (!account) return;
    setTxs(null);
    api.get(`/accounts/${account._id}/transactions`)
      .then(({ data }) => setTxs(data))
      .catch(() => setTxs([]));
  }, [account]);

  if (!account) return null;

  const owed = LIABILITIES.includes(account.type);
  const signed = (t) => {
    if (t.type === "income") return t.amount;
    if (t.type === "expense") return -t.amount;
    return String(t.account) === String(account._id) ? -(t.amount + (t.fee || 0)) : t.amount;
  };

  const rows = [
    ["Type", account.type],
    account.provider && ["Bank / E-wallet", account.provider],
    [owed ? "Starting amount owed" : "Starting balance", formatMoney(account.balance)],
    account.notes && ["Notes", account.notes],
    ["Added", fmtDate(account.createdAt)],
  ].filter(Boolean);

  return (
    <Modal open onClose={onClose} title={account.name} size="max-w-lg">
      <div className="mb-4 rounded-2xl bg-slate-50 p-4">
        <div className="text-sm text-slate-500">{owed ? "Currently owed" : "Current balance"}</div>
        <div className={`text-3xl font-bold ${owed ? "text-red-600" : "text-slate-800"}`}>{formatMoney(account.currentBalance)}</div>
      </div>

      <dl className="mb-5 divide-y divide-slate-100 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <h4 className="mb-2 font-semibold">Recent activity</h4>
      {txs === null && <p className="text-slate-500">Loading...</p>}
      {txs?.length === 0 && <p className="text-slate-500">No transactions linked to this account yet.</p>}
      <ul className="divide-y divide-slate-100">
        {txs?.map((t) => {
          const amt = signed(t);
          return (
            <li key={t._id} className="flex items-center gap-3 py-2">
              <TxIcon t={t} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{txTitle({ ...t, account: t.account })}</div>
                <div className="truncate text-sm text-slate-500">
                  {[t.description, t.fee > 0 && `fee ${formatMoney(t.fee)}`, fmtDateTime(t.date)].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className={`font-semibold ${amt >= 0 ? "text-green-600" : "text-red-600"}`}>
                {amt >= 0 ? "+" : "-"}{formatMoney(Math.abs(amt))}
              </span>
            </li>
          );
        })}
      </ul>

      <button onClick={() => onEdit(account)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 font-medium hover:bg-slate-200">
        <Pencil size={16} /> Edit account
      </button>
    </Modal>
  );
}