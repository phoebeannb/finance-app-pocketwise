import { useState } from "react";
import api from "../api/axios";
import { useQuickAdd } from "../context/QuickAddContext";
import ConfirmModal from "./ConfirmModal";
import { Block, Row, secondaryBtn } from "./SettingsUI";

export default function DemoData() {
  const { refresh } = useQuickAdd();
  const [busy, setBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      await api.post("/demo/load", {}, { successMessage: "Demo data loaded. Have a look around." });
      refresh();
    } catch { /* the red message explains why */ } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Block title="Demo data" description="Fill an empty account with sample accounts, transactions, budgets and goals so you can see how everything looks.">
        <Row label="Load demo data" hint="Only works while your account is empty, so it never mixes with your own data.">
          <button onClick={load} disabled={busy} className={secondaryBtn}>{busy ? "Loading..." : "Load demo data"}</button>
        </Row>
        <Row label="Remove Demo Data" hint="Deletes everything in this account, including anything you added yourself afterwards.">
          <button onClick={() => setRemoveOpen(true)}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Remove demo data...</button>
        </Row>
      </Block>

      <ConfirmModal
        open={removeOpen}
        title="Remove Demo Data"
        confirmLabel="Remove everything"
        message="Are you sure you want to remove the demo data? This deletes everything in your account, including anything you added yourself after loading it. It can't be undone."
        onClose={() => setRemoveOpen(false)}
        onConfirm={async () => { await api.delete("/demo", { successMessage: "Demo data removed." }); refresh(); }}
      />
    </>
  );
}