import Modal from "./Modal";
import QuickCapture from "./QuickCapture";

export default function QuickAddSheet({ open, onClose, onSaved, onMore }) {
  return (
    <Modal open={open} onClose={onClose} title="Quick add">
      <QuickCapture compact autoFocus onCaptured={() => { onSaved(); onClose(); }} />
      <button type="button" onClick={onMore}
        className="mt-3 w-full rounded-lg border border-slate-300 py-2.5 text-sm font-medium hover:bg-slate-50">
        Add with more details (account, category, mood)
      </button>
    </Modal>
  );
}