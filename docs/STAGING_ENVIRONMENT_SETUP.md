# AO OS Staging Environment Setup

Reference for configuring and verifying the staging web app deployment on Vercel.

Companion files:

- Web staging env template: `apps/web/.env.staging.example`
- Deployment runbook: `docs/DEPLOYMENT_RUNBOOK.md`

## Staging URLs

| Service | URL |
|---------|-----|
| Web app | `https://staging.aosanctuary.com` |
| API | `https://api-staging.aosanctuary.com/v1` |
| API health | `https://api-staging.aosanctuary.com/v1/health` |

## Vercel Project Setup

1. Create a new Vercel project (or branch deployment) for the web app.
2. Set the root directory to `apps/web`.
3. Add the following environment variables (all environments → staging):

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `API_BASE_URL` | `https://api-staging.aosanctuary.com/v1` |
| `WEB_BASE_URL` | `https://staging.aosanctuary.com` |
| `SESSION_SECRET` | *(generate a fresh 32+ char random secret)* |

4. Attach the custom domain `staging.aosanctuary.com`.
5. Deploy.

### Generating SESSION_SECRET

Use any of the following to produce a suitable secret:

```bash
# OpenSSL
openssl rand -base64 48

# Node
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# PowerShell
[System.Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Post-Deploy Verification

### 1. Login smoke test

1. Open `https://staging.aosanctuary.com/login`.
2. Sign in with the staging admin credentials.
3. Confirm you land in the staff app.
4. Confirm the staff page loads and API-backed data resolves.

### 2. Full smoke test (from local machine)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-vm-post-deploy-smoke.ps1 `
  -HostName ao-os-api-staging `
  -ApiBase https://api-staging.aosanctuary.com `
  -WebBase https://staging.aosanctuary.com `
  -Build
```

## Environment Separation Rules

- `SESSION_SECRET` must be unique to staging. Never reuse production values.
- `API_BASE_URL` must point to the staging API, not production.
- Staging and production must not share a database or JWT secret.

See `docs/DEPLOYMENT_RUNBOOK.md` section F for the full environment separation rules.
