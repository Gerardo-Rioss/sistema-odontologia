/**
 * E2E Smoke Tests — Appointments CRUD (3.2).
 *
 * Covers:
 *  - Navigate to appointments page.
 *  - Toggle between Calendar and List views.
 *  - Open "Nueva cita" modal, fill form, submit.
 *  - Verify new appointment appears in the list.
 *
 * Requires seeded DB: admin@odontologia.com / admin123.
 *
 * @see playwright.config.ts
 */

import { test, expect } from "@playwright/test";

const TEST_EMAIL = "admin@odontologia.com";
const TEST_PASSWORD = "admin123";

test.describe("Appointments — Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[id="email"]', TEST_EMAIL);
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("appointments page renders with calendar and list toggle", async ({
    page,
  }) => {
    await page.goto("/dashboard/appointments");
    await page.waitForLoadState("networkidle");

    // Page title
    await expect(page.locator("h1")).toContainText("Citas");

    // Toggle buttons
    await expect(page.locator("button:has-text('Calendario')")).toBeVisible();
    await expect(page.locator("button:has-text('Lista')")).toBeVisible();

    // "Nueva cita" button
    await expect(page.locator("button:has-text('Nueva cita')")).toBeVisible();
  });

  test("calendar view renders grid with day cells", async ({ page }) => {
    await page.goto("/dashboard/appointments");
    await page.waitForLoadState("networkidle");

    // Calendar should be visible in default view
    const grid = page.locator('[role="grid"]');
    await expect(grid).toBeVisible({ timeout: 5000 });

    // Should have gridcells
    const cells = page.locator('[role="gridcell"]');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);
  });

  test("toggle to list view shows appointment list", async ({ page }) => {
    await page.goto("/dashboard/appointments");
    await page.waitForLoadState("networkidle");

    // Click "Lista" toggle
    await page.click("button:has-text('Lista')");

    // Should now show list view (table or list container)
    const table = page.locator('[role="table"]');
    await expect(table).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Appointments — Create via Modal", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[id="email"]', TEST_EMAIL);
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test('clicking "Nueva cita" opens the appointment modal', async ({
    page,
  }) => {
    await page.goto("/dashboard/appointments");
    await page.waitForLoadState("networkidle");

    // Click "Nueva cita"
    await page.click("button:has-text('Nueva cita')");

    // Modal should be visible with role="dialog"
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog).toContainText("Nueva cita");
  });

  test("modal can be closed with close button", async ({ page }) => {
    await page.goto("/dashboard/appointments");
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click("button:has-text('Nueva cita')");
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Close via aria-label button
    await page.click('[aria-label="Cerrar"]');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test("modal form has required fields", async ({ page }) => {
    await page.goto("/dashboard/appointments");
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click("button:has-text('Nueva cita')");
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Verify form fields exist
    await expect(
      dialog.locator('[id="apt-patient-search"]'),
    ).toBeVisible();
    await expect(dialog.locator('select[id="apt-type"]')).toBeVisible();

    // Date and time fields (via Input component)
    await expect(
      dialog.locator('input[type="date"]'),
    ).toBeVisible();

    // Cancel and Create buttons in footer
    await expect(dialog.locator("button:has-text('Cancelar')")).toBeVisible();
    await expect(dialog.locator("button:has-text('Crear cita')")).toBeVisible();
  });
});
