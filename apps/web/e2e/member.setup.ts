import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = 'e2e/.auth/member.json'

setup('authenticate as test member', async ({ page }) => {
  const email = process.env.E2E_MEMBER_EMAIL ?? 'e2e-member@ao-os.test'
  const password = process.env.E2E_MEMBER_PASSWORD ?? 'E2eMemberPass1!'

  if (!process.env.E2E_MEMBER_ID) {
    console.warn('[member-setup] E2E_MEMBER_ID not set — member seed likely failed. Writing empty auth state.')
    fs.mkdirSync(path.dirname(authFile), { recursive: true })
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  await page.goto('/member/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('[type="submit"]')

  await expect(page).toHaveURL(/\/member(\/dashboard)?/, { timeout: 15_000 })

  fs.mkdirSync(path.dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
