import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL;
const token = process.env.TEST_TOKEN;

test("health endpoint responds", { skip: !baseUrl }, async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("protected API rejects unauthenticated requests", { skip: !baseUrl }, async () => {
  const response = await fetch(`${baseUrl}/api/budgets`);
  assert.equal(response.status, 401);
});

test("authenticated budget endpoint is reachable", { skip: !baseUrl || !token }, async () => {
  const response = await fetch(`${baseUrl}/api/budgets?period=weekly`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(await response.json()));
});
