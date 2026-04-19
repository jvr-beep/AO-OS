import { test, expect } from '@playwright/test'

test.describe('Staff auth flows', () => {
  test('valid credentials → redirects to /dashboard', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@ao-os.dev'
    const password = process.env.E2E_ADMIN_PASSWORD ?? 'CiTestPass123!'

    await page.goto('/login')
    await page.fill('[name="email"]', email)
    await page.fill('[name="password"]', password)
    await page.click('[type="submit"]')

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('wrong password → inline error, stays on /login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@ao-os.dev')
    await page.fill('[name="password"]', 'wrong-password-e2e')
    await page.click('[type="submit"]')

    await expect(page.locator('text=Invalid email or password')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated /dashboard → redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated /check-in → redirects to /login', async ({ page }) => {
    await page.goto('/check-in')
    await expect(page).toHaveURL(/\/login/)
  })

  test('password reset request → ?reset=sent', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("Forgot password?")')
    await page.fill('[name="email"]', 'nonexistent@ao-os.dev')
    await page.click('button:has-text("Send reset link")')

    await expect(page).toHaveURL(/reset=sent/, { timeout: 15_000 })
    await expect(page.locator('text=password reset link has been sent')).toBeVisible()
  })
})
