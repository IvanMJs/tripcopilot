import { test, expect } from "@playwright/test";

test.describe("API endpoints", () => {
  test("faa-status returns valid response", async ({ request }) => {
    const res = await request.get("/api/faa-status");
    expect(res.status()).toBeLessThan(500);
  });

  test("flight-status requires params", async ({ request }) => {
    const res = await request.get("/api/flight-status");
    expect(res.status()).toBe(400);
  });
});
