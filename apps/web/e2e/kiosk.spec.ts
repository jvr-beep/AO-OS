import { test, expect } from '@playwright/test'

test.describe('Kiosk — welcome screen', () => {
  test('loads without crash', async ({ page }) => {
    await page.goto('/kiosk')
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })
})

test.describe('Kiosk — identity page', () => {
  test('identity form is present', async ({ page }) => {
    await page.goto('/kiosk/identity')
    await expect(page.locator('[name="email"]')).toBeVisible({ timeout: 10_000 })
  })

  test('submitting identity redirects to /kiosk/waiver', async ({ page }) => {
    await page.goto('/kiosk/identity')
    await page.fill('[name="email"]', `e2e-kiosk-${Date.now()}@ao-os.test`)
    await page.click('[type="submit"]')
    await expect(page).toHaveURL(/\/kiosk\/waiver/, { timeout: 15_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })
})

test.describe('Kiosk — session guard', () => {
  test('waiver page without session redirects to /kiosk', async ({ page }) => {
    await page.goto('/kiosk/waiver')
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('select page without session redirects to /kiosk', async ({ page }) => {
    await page.goto('/kiosk/select')
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('product page without session redirects to /kiosk', async ({ page }) => {
    await page.goto('/kiosk/product')
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })
})

test.describe('Kiosk — booking flow pages', () => {
  test('booking page loads without crash', async ({ page }) => {
    await page.goto('/kiosk/booking')
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })
})
