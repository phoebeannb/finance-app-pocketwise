import { createWorker } from "tesseract.js";

const moneyPattern = /(?:₱|PHP|P)\s*([0-9][0-9,]*(?:\.[0-9]{2})?)|([0-9][0-9,]*\.[0-9]{2})/gi;
const datePattern = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/;

const numberValue = (value) => Number(String(value).replace(/,/g, ""));

export function parseReceiptText(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const amounts = [...text.matchAll(moneyPattern)]
    .map((match) => numberValue(match[1] || match[2]))
    .filter((value) => Number.isFinite(value) && value > 0);
  const totalLine = lines.find((line) => /total|amount due|grand total|balance/i.test(line));
  const totalMatch = totalLine?.match(moneyPattern);
  const amount = totalMatch ? numberValue(totalMatch[0].replace(/[^\d.,]/g, "")) : Math.max(...amounts, 0);
  const description = lines.find((line) => /[A-Za-z]{3,}/.test(line) && !/receipt|invoice|total|date|cashier|thank/i.test(line)) || "";
  const date = text.match(datePattern)?.[0] || "";
  return { description: description.slice(0, 200), amount: amount || "", date, text };
}

export async function scanReceipt(image, onProgress) {
  const worker = await createWorker("eng", 1, {
    logger: (message) => onProgress?.(message.progress || 0),
  });
  try {
    const { data } = await worker.recognize(image);
    return parseReceiptText(data.text);
  } finally {
    await worker.terminate();
  }
}
