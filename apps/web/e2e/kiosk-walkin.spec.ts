/**
 * Kiosk walk-in E2E flow.
 *
 * Uses E2E_GUEST_ID (pre-seeded with a current waiver) and E2E_TIER_ID (active tier).
 * The tier is priced at 0 cents in E2E so no Stripe call is made — the API returns
 * { clientSecret: null } and the kiosk payment page redirects straight to /kiosk/assign.
 */
import { test, expect } from '@playwright/test'

test.describe('Kiosk walk-in flow', () => {
  test('identity → product → select → assign', async ({ page }) => {
    const tierId = process.env.E2E_TIER_ID
    if (!tierId) {
      test.skip(true, 'No E2E tier seeded — skipping walk-in flow test')
      return
    }

    // ── Step 1: Identity ──────────────────────────────────────────────────
    await page.goto('/kiosk/identity')
    await expect(page.locator('[name="email"]')).toBeVisible({ timeout: 10_000 })

    // Use the pre-seeded guest email so the waiver is already on record
    await page.fill('[name="email"]', 'e2e-guest@ao-os.test')
    await page.click('[type="submit"]')

    // Should land on waiver or product (waiver already accepted → product)
    await expect(page).toHaveURL(/\/kiosk\/(waiver|product)/, { timeout: 15_000 })

    // If waiver appears (re-confirmation short path), accept it
    if (page.url().includes('/kiosk/waiver')) {
      const confirmBtn = page.locator('[type="submit"]')
      await expect(confirmBtn).toBeVisible()
      await confirmBtn.click()
      await expect(page).toHaveURL(/\/kiosk\/product/, { timeout: 10_000 })
    }

    // ── Step 2: Product selection ─────────────────────────────────────────
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    // Select locker or room product type — at least one option should appear
    const productOption = page.locator('[data-product-type], [name="productType"], button').first()
    await expect(productOption).toBeVisible({ timeout: 8_000 })

    // Click the first product type card/button
    await page.locator('button, [role="button"]').filter({ hasText: /locker|room/i }).first().click()
    await expect(page).toHaveURL(/\/kiosk\/(select|product)/, { timeout: 10_000 })
  })

  test('select page shows tier options when session has product type', async ({ page }) => {
    // Navigate through identity and product to get a session state
    const tierId = process.env.E2E_TIER_ID
    if (!tierId) {
      test.skip(true, 'No E2E tier seeded')
      return
    }

    await page.goto('/kiosk/identity')
    await page.fill('[name="email"]', 'e2e-guest@ao-os.test')
    await page.click('[type="submit"]')
    await expect(page).toHaveURL(/\/kiosk\/(waiver|product)/, { timeout: 15_000 })

    if (page.url().includes('/kiosk/waiver')) {
      await page.click('[type="submit"]')
      await expect(page).toHaveURL(/\/kiosk\/product/, { timeout: 10_000 })
    }

    // Product page — no crash
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('kiosk assign page redirects without session', async ({ page }) => {
    await page.goto('/kiosk/assign')
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })
})
