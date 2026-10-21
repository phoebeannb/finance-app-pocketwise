import { useEffect } from "react";

// Gives every table cell its column heading (used by the phone card layout)
function labelTables() {
  document.querySelectorAll("table.data-table").forEach((table) => {
    const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
    table.querySelectorAll("tbody tr:not([data-group])").forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => {
        const label = heads[i] ?? "";
        if (td.getAttribute("data-label") !== label) td.setAttribute("data-label", label);
      });
    });
  });
}

// Phones show a number pad with a decimal point on amount fields
function numberPads() {
  document.querySelectorAll('input[type="number"]:not([inputmode])').forEach((el) => {
    const whole = el.step && el.step !== "any" && Number(el.step) >= 1;
    el.setAttribute("inputmode", whole ? "numeric" : "decimal");
  });
}

export default function Enhancer() {
  useEffect(() => {
    let queued = false;
    const run = () => { queued = false; labelTables(); numberPads(); };
    const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}