import { test, expect } from '@playwright/test'

test.describe('Lockers', () => {
  test('lockers list page loads', async ({ page }) => {
    await page.goto('/lockers')

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
  })

  test('lockers page shows content (table or empty state)', async ({ page }) => {
    await page.goto('/lockers')

    // Either a table of lockers or an empty state message — never blank or crashed
    const hasTable = await page.locator('table').count()
    const hasEmpty = await page.locator('text=/[Nn]o lockers/').count()
    const hasHeading = await page.locator('h1, h2').count()
    expect(hasTable + hasEmpty + hasHeading).toBeGreaterThan(0)
  })

  test('individual locker detail loads when lockers exist', async ({ page }) => {
    // Get first locker via API to construct URL
    const token = process.env.E2E_ADMIN_TOKEN
    if (!token) {
      test.skip(true, 'No admin token from global-setup')
      return
    }

    const apiBase = process.env.E2E_API_BASE ?? 'http://localhost:4000/v1'
    const res = await fetch(`${apiBase}/lockers?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      test.skip(true, 'Could not fetch lockers from API')
      return
    }

    const data = await res.json() as Array<{ id: string }> | { data: Array<{ id: string }> }
    const lockers = Array.isArray(data) ? data : data.data
    if (!lockers || lockers.length === 0) {
      test.skip(true, 'No lockers seeded — skipping detail page test')
      return
    }

    await page.goto(`/lockers/${lockers[0].id}`)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })
})
