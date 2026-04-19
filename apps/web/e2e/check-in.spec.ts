import { test, expect } from '@playwright/test'

test.describe('Check-In Console', () => {
  test('page loads with all three panels', async ({ page }) => {
    await page.goto('/check-in')

    await expect(page.locator('h1')).toContainText('Check-In Console')
    await expect(page.locator('text=Booking Check-In')).toBeVisible()
    await expect(page.locator('text=Walk-In Check-In')).toBeVisible()
    await expect(page.locator('text=Quick Checkout')).toBeVisible()
  })

  test('walk-in form: missing guest → shows error, no crash', async ({ page }) => {
    await page.goto('/check-in')

    // Leave guestId blank — form has required attribute, browser validation fires
    const tierId = process.env.E2E_TIER_ID
    if (tierId) await page.selectOption('[name="tierId"]', tierId)
    await page.fill('[name="durationMinutes"]', '60')
    await page.fill('[name="quotedPriceCents"]', '2000')

    await page.click('button:has-text("Walk-In Check In")')

    // Should not navigate away — browser required validation or server error param
    await expect(page).not.toHaveURL(/\/visits\/[a-z0-9-]{36}/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('full walk-in flow → visit created and redirected to /visits/:id', async ({ page }) => {
    const guestId = process.env.E2E_GUEST_ID
    const tierId = process.env.E2E_TIER_ID
    if (!guestId || !tierId) {
      test.skip(true, 'No E2E guest or tier seeded — skipping walk-in mutation test')
      return
    }

    await page.goto('/check-in')

    await page.fill('[name="guestId"]', guestId)
    await page.selectOption('[name="tierId"]', tierId)
    await page.fill('[name="durationMinutes"]', '60')
    await page.fill('[name="quotedPriceCents"]', '1500')
    await page.fill('[name="amountPaidCents"]', '1500')
    await page.selectOption('[name="paymentProvider"]', 'cash')

    await page.click('button:has-text("Walk-In Check In")')

    await expect(page).toHaveURL(/\/visits\/[a-z0-9-]{36}/, { timeout: 15_000 })
    await expect(page).toHaveURL(/ok=/)
  })

  test('checkout form: empty visit id → no crash', async ({ page }) => {
    await page.goto('/check-in')

    const checkoutInput = page.locator('[name="visitId"]').first()
    await checkoutInput.fill('')
    await page.click('button:has-text("Check Out")')

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })
})
