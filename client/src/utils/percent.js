export function largestRemainder(values, total = 100) {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!sum) return values.map(() => 0);
  const raw = values.map((v) => (v / sum) * total);
  const floors = raw.map(Math.floor);
  const left = total - floors.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, rem: r - floors[i] }))
    .sort((a, b) => b.rem - a.rem)
    .slice(0, left)
    .forEach(({ i }) => floors[i]++);
  return floors;
}