import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = 'e2e/.auth/staff.json'

setup('authenticate as staff admin', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@ao-os.dev'
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'CiTestPass123!'

  await page.goto('/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('[type="submit"]')

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  fs.mkdirSync(path.dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
