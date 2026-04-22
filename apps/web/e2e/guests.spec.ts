/**
 * Guest detail page E2E tests (staff-authenticated).
 *
 * Tests waiver history, wristband history, and merge form using the
 * pre-seeded E2E guest (e2e-guest@ao-os.test).
 */
import { test, expect } from '@playwright/test'

test.describe('Guest list', () => {
  test('loads without crash', async ({ page }) => {
    await page.goto('/guests')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })
})

test.describe('Guest detail page', () => {
  test('E2E guest detail loads without crash', async ({ page }) => {
    const guestId = process.env.E2E_GUEST_ID
    if (!guestId) {
      test.skip(true, 'No E2E guest seeded')
      return
    }

    await page.goto(`/guests/${guestId}`)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('shows waiver history section', async ({ page }) => {
    const guestId = process.env.E2E_GUEST_ID
    if (!guestId) {
      test.skip(true, 'No E2E guest seeded')
      return
    }

    await page.goto(`/guests/${guestId}`)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=/Waiver/i')).toBeVisible({ timeout: 10_000 })
  })

  test('shows wristband history section', async ({ page }) => {
    const guestId = process.env.E2E_GUEST_ID
    if (!guestId) {
      test.skip(true, 'No E2E guest seeded')
      return
    }

    await page.goto(`/guests/${guestId}`)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=/Wristband/i')).toBeVisible({ timeout: 10_000 })
  })

  test('shows merge form', async ({ page }) => {
    const guestId = process.env.E2E_GUEST_ID
    if (!guestId) {
      test.skip(true, 'No E2E guest seeded')
      return
    }

    await page.goto(`/guests/${guestId}`)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=/[Mm]erge/i')).toBeVisible({ timeout: 10_000 })
  })

  test('guest display identifier never shows raw name', async ({ page }) => {
    const guestId = process.env.E2E_GUEST_ID
    if (!guestId) {
      test.skip(true, 'No E2E guest seeded')
      return
    }

    await page.goto(`/guests/${guestId}`)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

    // Privacy: first/last name must not appear as the primary identifier in the heading
    // The page uses email as the display identifier
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
    await expect(heading).not.toContainText('E2E TestGuest')
  })

  test('unknown guest id → no crash (404 or error message)', async ({ page }) => {
    await page.goto('/guests/00000000-0000-0000-0000-000000000000')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    // Should show a graceful not-found message or redirect
  })
})
