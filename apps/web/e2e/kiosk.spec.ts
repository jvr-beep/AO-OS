import { test, expect } from '@playwright/test'

test.describe('Kiosk public flow', () => {
  test('kiosk home loads without crash', async ({ page }) => {
    await page.goto('/kiosk')
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('identify guest → redirects to /kiosk/waiver', async ({ page }) => {
    await page.goto('/kiosk')

    const firstNameInput = page.locator('[name="firstName"]')
    await expect(firstNameInput).toBeVisible()

    await firstNameInput.fill('E2E')
    await page.fill('[name="lastName"]', 'KioskTest')
    await page.fill('[name="email"]', `e2e-kiosk-${Date.now()}@ao-os.test`)

    await page.click('[type="submit"]')

    await expect(page).toHaveURL(/\/kiosk\/waiver/, { timeout: 15_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('waiver page loads (or redirects cleanly if no session)', async ({ page }) => {
    // Direct navigation without a session — should either show waiver or redirect to /kiosk, never crash
    await page.goto('/kiosk/waiver')
    const url = page.url()
    expect(url).toMatch(/\/(kiosk)/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('kiosk select page loads or redirects cleanly', async ({ page }) => {
    await page.goto('/kiosk/select')
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })
})
