import { test, expect } from '@playwright/test'

const ROUTES = [
  '/dashboard',
  '/check-in',
  '/visits',
  '/guests',
  '/members',
  '/bookings',
  '/cleaning',
  '/wristbands',
  '/lockers',
  '/staff',
  '/staff/audit',
  '/settings',
  '/rooms',
]

for (const route of ROUTES) {
  test(`${route} loads without crash`, async ({ page }) => {
    const response = await page.goto(route)

    // Must stay authenticated — not bounce to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

    // No Next.js error overlay or 500 page
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error: a client-side exception')).not.toBeVisible()
    await expect(page.locator('text=500')).not.toBeVisible()

    // HTTP-level: allow 200 or 304; never 500
    if (response) {
      expect(response.status()).toBeLessThan(500)
    }
  })
}
