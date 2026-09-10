import { expect, test } from "@playwright/test";

test("landing page shows OIDC sign-in CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "RAG Knowledge Assistant" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with OIDC" })).toBeVisible();
});
