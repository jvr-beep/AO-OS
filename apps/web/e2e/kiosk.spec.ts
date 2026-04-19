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

  test('waiver page loads or redirects cleanly without session', async ({ page }) => {
    // No session → should redirect to /kiosk, never show a crash page
    await page.goto('/kiosk/waiver')
    // Must end up somewhere under /kiosk
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('kiosk select page redirects cleanly without session', async ({ page }) => {
    // No session → redirect to /kiosk, never crash
    await page.goto('/kiosk/select')
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })
})
