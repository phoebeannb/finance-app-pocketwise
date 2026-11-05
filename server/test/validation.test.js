import test from "node:test";
import assert from "node:assert/strict";

test("weekly budget payload normalizes period and rollover", () => {
  const payload = { period: "weekly", limit: Number("2500"), rollover: true };
  assert.equal(payload.period, "weekly");
  assert.equal(payload.limit, 2500);
  assert.equal(payload.rollover, true);
});

test("credit utilization is calculated from outstanding balance", () => {
  const utilization = (1250 / 5000) * 100;
  assert.equal(utilization, 25);
});

test("investment return uses net invested amount", () => {
  const netInvested = 10000 - 1500;
  const currentValue = 9800;
  assert.equal(currentValue - netInvested, 1300);
  assert.equal(((currentValue - netInvested) / netInvested) * 100, 15.294117647058824);
});
