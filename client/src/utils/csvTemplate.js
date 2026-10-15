const CSV = [
  "Date,Description,Debit,Credit",
  "2026-10-01,Jollibee SM Bacoor,250.00,",
  "2026-10-02,Puregold groceries,1840.50,",
  "2026-10-03,Salary October,,25000.00",
  "2026-10-05,Meralco bill,2310.00,",
].join("\r\n");

export function downloadCsvTemplate() {
  const blob = new Blob([CSV + "\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pocketwise-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}