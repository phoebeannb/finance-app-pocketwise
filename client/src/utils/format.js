const LOCALES = { PHP: "en-PH" };

export const CURRENCIES = [
  ["PHP", "Philippine peso"], ["USD", "US dollar"], ["EUR", "Euro"], ["GBP", "British pound"],
  ["JPY", "Japanese yen"], ["SGD", "Singapore dollar"], ["AUD", "Australian dollar"],
  ["CAD", "Canadian dollar"], ["HKD", "Hong Kong dollar"], ["CNY", "Chinese yuan"],
  ["KRW", "South Korean won"], ["AED", "UAE dirham"], ["SAR", "Saudi riyal"],
];

const cache = {};
const formatterFor = (code) =>
  (cache[code] ||= new Intl.NumberFormat(LOCALES[code] || "en-US", { style: "currency", currency: code }));

let current = "PHP";
export const setCurrency = (code) => {
  try {
    formatterFor(code);
    current = code;
  } catch {
    current = "PHP";
  }
};

export const formatMoney = (n) => formatterFor(current).format(n);
export const formatMoneyIn = (code, n) => formatterFor(code).format(n);