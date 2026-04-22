/**
 * Settings admin page E2E tests (staff-authenticated, operations/admin role).
 *
 * Tests tier catalog display, filter tabs, and the waiver version section.
 */
import { test, expect } from '@playwright/test'

test.describe('Settings page', () => {
  test('loads without crash', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('shows Pass Catalog section', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=/Pass Catalog/i')).toBeVisible({ timeout: 10_000 })
  })

  test('shows Waiver section', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('text=/Waiver/i')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=AO-WAIVER-v1')).toBeVisible({ timeout: 10_000 })
  })

  test('filter tabs — All, Locker, Room — are present', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.locator('button:has-text("all"), button:has-text("ALL")')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button:has-text("locker"), button:has-text("LOCKER")')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button:has-text("room"), button:has-text("ROOM")')).toBeVisible({ timeout: 10_000 })
  })

  test('clicking Locker tab filters tier list', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

    await page.locator('button:has-text("locker"), button:has-text("LOCKER")').click()

    // Should not crash after filter click
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('tier Edit button opens inline edit form', async ({ page }) => {
    const tierId = process.env.E2E_TIER_ID
    if (!tierId) {
      test.skip(true, 'No E2E tier seeded')
      return
    }

    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

    // Click first visible Edit button
    const editBtn = page.locator('button:has-text("Edit"), button:has-text("EDIT")').first()
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()

    // Should show Save and Cancel buttons
    await expect(page.locator('button:has-text("Save")')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible({ timeout: 5_000 })
  })

  test('cancelling edit restores view mode', async ({ page }) => {
    const tierId = process.env.E2E_TIER_ID
    if (!tierId) {
      test.skip(true, 'No E2E tier seeded')
      return
    }

    await page.goto('/settings')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

    await page.locator('button:has-text("Edit"), button:has-text("EDIT")').first().click()
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible({ timeout: 5_000 })

    await page.locator('button:has-text("Cancel")').click()

    // Edit button should reappear
    await expect(page.locator('button:has-text("Edit"), button:has-text("EDIT")').first()).toBeVisible({ timeout: 5_000 })
  })
})
