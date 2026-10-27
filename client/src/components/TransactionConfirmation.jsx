import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "../utils/format";
import { fmtDateTime } from "../utils/datetime";
import Modal from "./Modal";

const labels = { income: "Income", expense: "Expense", transfer: "Transfer" };

export default function TransactionConfirmation({ open, transaction, onDone }) {
  if (!transaction) return null;
  const isTransfer = transaction.type === "transfer";
  return (
    <Modal open={open} onClose={onDone} title={`${labels[transaction.type] || "Transaction"} added`}>
      <div className="space-y-4">
        <div className="flex flex-col items-center rounded-xl border border-green-200 bg-green-50 p-5 text-center">
          <CheckCircle2 size={42} className="text-green-600" aria-hidden="true" />
          <h4 className="mt-2 text-lg font-semibold text-green-900">Added successfully</h4>
          <p className="mt-1 text-sm text-green-800">The transaction is now in your account.</p>
        </div>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 p-3">
            <span className="text-sm text-slate-600">Type</span>
            <strong className="ml-auto text-sm text-slate-900">{labels[transaction.type] || "Transaction"}</strong>
          </div>
          <div className="flex items-center gap-3 p-3">
            <span className="text-sm text-slate-600">Amount</span>
            <strong className={`ml-auto text-sm ${transaction.type === "expense" ? "text-rose-700" : "text-green-700"}`}>
              {formatMoney(transaction.amount)}
            </strong>
          </div>
          {!isTransfer && (
            <div className="flex items-center gap-3 p-3">
              <span className="text-sm text-slate-600">Category</span>
              <strong className="ml-auto text-right text-sm text-slate-900">{transaction.category || "Uncategorized"}</strong>
            </div>
          )}
          <div className="flex items-center gap-3 p-3">
            <span className="text-sm text-slate-600">{isTransfer ? "From account" : "Description"}</span>
            <strong className="ml-auto max-w-[60%] truncate text-right text-sm text-slate-900">
              {isTransfer ? transaction.accountName || "No account" : transaction.description || "No description"}
            </strong>
          </div>
          {isTransfer && (
            <div className="flex items-center gap-3 p-3">
              <span className="text-sm text-slate-600">To account</span>
              <strong className="ml-auto max-w-[60%] truncate text-right text-sm text-slate-900">{transaction.toAccountName || "No account"}</strong>
            </div>
          )}
          {!isTransfer && transaction.accountName && (
            <div className="flex items-center gap-3 p-3">
              <span className="text-sm text-slate-600">Account</span>
              <strong className="ml-auto max-w-[60%] truncate text-right text-sm text-slate-900">{transaction.accountName}</strong>
            </div>
          )}
          {transaction.receiptAttached && (
            <div className="flex items-center gap-3 p-3">
              <span className="text-sm text-slate-600">Receipt</span>
              <strong className="ml-auto text-sm text-green-700">Attached</strong>
            </div>
          )}
          <div className="flex items-center gap-3 p-3">
            <span className="text-sm text-slate-600">Added</span>
            <strong className="ml-auto text-right text-sm text-slate-900">{fmtDateTime(transaction.date)}</strong>
          </div>
        </div>
        <button type="button" onClick={onDone} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Done
        </button>
      </div>
    </Modal>
  );
}
