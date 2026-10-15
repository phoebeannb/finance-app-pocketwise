// Lowercase, letters only, padded with spaces so matches are whole words ("sm" won't match "smart")
export const norm = (s) => ` ${String(s || "").toLowerCase().replace(/[^a-z]+/g, " ").trim()} `;

const RAW = [
  ["expense", "Food & Dining", ["jollibee", "mcdonald", "mcdo", "kfc", "starbucks", "grabfood", "grab food", "foodpanda", "mang inasal", "chowking", "greenwich", "pizza hut", "dominos", "bonchon", "shakeys", "burger king", "dunkin", "tim hortons", "coffee bean", "yellow cab", "potato corner", "restaurant", "cafe", "bakery"]],
  ["expense", "Subscriptions", ["netflix", "spotify", "youtube premium", "disney", "hbo", "icloud", "apple com bill", "google one", "chatgpt", "openai", "adobe", "canva", "microsoft", "amazon prime", "viu"]],
  ["expense", "Transportation", ["grab", "grabcar", "angkas", "joyride", "move it", "mrt", "lrt", "beep", "easytrip", "autosweep", "shell", "petron", "caltex", "seaoil", "phoenix", "toll", "parking"]],
  ["expense", "Groceries", ["puregold", "eleven", "ministop", "alfamart", "landers", "s r", "robinsons supermarket", "waltermart", "savemore", "shopwise", "sm supermarket", "sm hypermarket", "supermarket", "grocery"]],
  ["expense", "Healthcare", ["mercury drug", "watsons", "southstar", "rose pharmacy", "generika", "hospital", "clinic", "medical", "dental", "pharmacy", "drugstore"]],
  ["expense", "Bills & Utilities", ["meralco", "pldt", "globe", "smart", "converge", "maynilad", "manila water", "dito", "sky cable", "cignal", "water district", "electric", "postpaid"]],
  ["expense", "Shopping", ["shopee", "lazada", "zalora", "uniqlo", "shein", "temu", "decathlon", "miniso", "daiso", "ikea"]],
  ["expense", "Entertainment", ["cinema", "steam", "playstation", "xbox", "nintendo", "mobile legends", "timezone", "bowling", "ticketnet", "smtickets"]],
  ["expense", "Education", ["tuition", "school", "university", "college", "coursera", "udemy", "enrollment"]],
  ["expense", "Travel", ["cebu pacific", "cebu pac", "airasia", "philippine airlines", "agoda", "booking com", "airbnb", "traveloka", "klook", "hotel"]],
  ["expense", "Insurance", ["sun life", "pru life", "philam", "insular life", "axa", "insurance", "philhealth", "sss", "pag ibig", "pagibig"]],
  ["expense", "Rent/Mortgage", ["rent", "landlord", "mortgage", "amortization", "association dues"]],
  ["expense", "Personal Care", ["salon", "barber", "belo", "spa", "nail", "grooming"]],
  ["expense", "Pets", ["pet", "vet", "veterinary"]],
  ["expense", "Savings & Investment", ["gsave", "ginvest", "mp2", "uitf", "col financial", "mutual fund"]],
  ["expense", "Gift & Donations", ["donation", "charity", "red cross", "church", "tithes", "unicef"]],

  ["income", "Salary", ["salary", "payroll", "sahod", "wages"]],
  ["income", "Freelance/Gig", ["upwork", "fiverr", "payoneer", "freelance"]],
  ["income", "Investment Returns", ["interest", "dividend"]],
  ["income", "Bonus/Commission", ["bonus", "th month", "commission"]],
  ["income", "Refund", ["refund", "reversal", "chargeback"]],
  ["income", "Gift/Inheritance", ["gift"]],
];

const BUILT_IN = RAW.map(([type, category, words]) => ({ type, category, words: words.map(norm) }));

export function prepareRules(rules) {
  return rules
    .map((r) => ({ ...r, pad: ` ${r.keyword} ` }))
    .sort((a, b) => b.keyword.length - a.keyword.length); // longest (most specific) first
}

export function suggestCategory(description, type, prepared) {
  const d = norm(description);
  for (const r of prepared) {
    if (r.type === type && d.includes(r.pad)) return { category: r.category, source: "rule" };
  }
  for (const b of BUILT_IN) {
    if (b.type === type && b.words.some((w) => d.includes(w))) return { category: b.category, source: "auto" };
  }
  return { category: "", source: null };
}