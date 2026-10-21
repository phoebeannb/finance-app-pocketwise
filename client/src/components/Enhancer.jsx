import { useEffect } from "react";

// Gives every table cell its column heading (used by the card layout) and keeps table meaning for screen readers
function labelTables() {
  document.querySelectorAll("table.data-table").forEach((table) => {
    table.setAttribute("role", "table");
    table.querySelectorAll("thead, tbody").forEach((g) => g.setAttribute("role", "rowgroup"));
    table.querySelectorAll("tr").forEach((tr) => tr.setAttribute("role", "row"));
    const heads = Array.from(table.querySelectorAll("thead th"));
    heads.forEach((th) => th.setAttribute("role", "columnheader"));
    const names = heads.map((th) => th.textContent.trim());
    table.querySelectorAll("tbody tr").forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => {
        td.setAttribute("role", "cell");
        const label = names[i] ?? "";
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