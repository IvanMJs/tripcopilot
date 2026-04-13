import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/TripCopilot/i);
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.locator("text=Iniciar sesión").or(page.locator("text=Sign in"))
    ).toBeVisible();
  });

  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
  });
});
