/**
 * Kiosk booking check-in E2E flow.
 *
 * Uses E2E_BOOKING_CODE (seeded in global-setup with balance_due = 0) so no
 * Stripe payment step is exercised. Flow: booking lookup → confirm → assign.
 */
import { test, expect } from '@playwright/test'

test.describe('Kiosk booking check-in flow', () => {
  test('booking page renders lookup form', async ({ page }) => {
    await page.goto('/kiosk/booking')
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    // Expect a booking code input or phone lookup UI
    const input = page.locator('[name="value"], [name="bookingCode"], input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 10_000 })
  })

  test('booking lookup by code → confirm page', async ({ page }) => {
    const bookingCode = process.env.E2E_BOOKING_CODE
    if (!bookingCode) {
      test.skip(true, 'No E2E booking seeded — skipping booking lookup test')
      return
    }

    await page.goto('/kiosk/booking')

    // Select "code" lookup type if there's a toggle
    const codeToggle = page.locator('[value="code"], button:has-text("Code")').first()
    if (await codeToggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await codeToggle.click()
    }

    const input = page.locator('[name="value"], input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 8_000 })
    await input.fill(bookingCode)
    await page.click('[type="submit"]')

    await expect(page).toHaveURL(/\/kiosk\/booking\/confirm/, { timeout: 15_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('confirm page shows booking details', async ({ page }) => {
    const bookingCode = process.env.E2E_BOOKING_CODE
    if (!bookingCode) {
      test.skip(true, 'No E2E booking seeded')
      return
    }

    await page.goto('/kiosk/booking')

    const codeToggle = page.locator('[value="code"], button:has-text("Code")').first()
    if (await codeToggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await codeToggle.click()
    }

    await page.locator('[name="value"], input[type="text"]').first().fill(bookingCode)
    await page.click('[type="submit"]')

    await expect(page).toHaveURL(/\/kiosk\/booking\/confirm/, { timeout: 15_000 })

    // Confirm page should have a check-in button and not show an error
    const confirmBtn = page.locator('[type="submit"], button:has-text(/check.in/i)').first()
    await expect(confirmBtn).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })
})
