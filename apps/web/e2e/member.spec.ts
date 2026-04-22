/**
 * Member portal E2E tests.
 *
 * Runs under the 'member' project which uses e2e/.auth/member.json (set by member.setup.ts).
 * If member seeding failed, most tests will be skipped gracefully.
 */
import { test, expect } from '@playwright/test'

function requireMember() {
  if (!process.env.E2E_MEMBER_ID) {
    test.skip(true, 'No E2E member seeded — skipping')
  }
}

test.describe('Member portal — dashboard', () => {
  test('loads without crash', async ({ page }) => {
    requireMember()
    await page.goto('/member')
    await expect(page).not.toHaveURL(/\/member\/login/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('shows membership card', async ({ page }) => {
    requireMember()
    await page.goto('/member')
    await expect(page).not.toHaveURL(/\/member\/login/, { timeout: 10_000 })
    // Member number format: AO-...
    await expect(page.locator('text=/AO-/')).toBeVisible({ timeout: 10_000 })
  })

  test('shows visit history and membership quick links', async ({ page }) => {
    requireMember()
    await page.goto('/member')
    await expect(page.locator('text=/Visit History/i')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=/Membership/i')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Member portal — visit history', () => {
  test('loads without crash', async ({ page }) => {
    requireMember()
    await page.goto('/member/visits')
    await expect(page).not.toHaveURL(/\/member\/login/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })
})

test.describe('Member portal — subscription', () => {
  test('loads without crash', async ({ page }) => {
    requireMember()
    await page.goto('/member/subscription')
    await expect(page).not.toHaveURL(/\/member\/login/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })
})

test.describe('Member portal — account settings', () => {
  test('loads without crash', async ({ page }) => {
    requireMember()
    await page.goto('/member/account')
    await expect(page).not.toHaveURL(/\/member\/login/, { timeout: 10_000 })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('account form is visible', async ({ page }) => {
    requireMember()
    await page.goto('/member/account')
    await expect(page).not.toHaveURL(/\/member\/login/, { timeout: 10_000 })
    // Should have at least one input or form
    const count = await page.locator('input, textarea').count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Member portal — login wall', () => {
  test('unauthenticated request redirects to /member/login', async ({ browser }) => {
    // Use a fresh context with no stored auth
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/member')
    await expect(page).toHaveURL(/\/member\/login/, { timeout: 10_000 })
    await ctx.close()
  })
})
