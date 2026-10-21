const cell = (v) => (/[",\r\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
const pad = (n) => String(n).padStart(2, "0");
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function downloadCsvTemplate(accountName = "My bank account") {
  const rows = [
    ["Date", "Type", "Category", "Description", "Account", "Amount"],
    [daysAgo(3), "Expense", "Food & Dining", "Jollibee SM Bacoor", accountName, "250.00"],
    [daysAgo(3), "Expense", "Groceries", "Puregold", accountName, "1840.50"],
    [daysAgo(2), "Income", "Salary", "October salary", accountName, "25000.00"],
    [daysAgo(1), "Expense", "Bills & Utilities", "Meralco bill", accountName, "2310.00"],
  ];
  const text = rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pocketwise-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}