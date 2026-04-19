# AO OS Deployment Runbook

This runbook deploys AO OS as three services:

1. `apps/web` (Next.js operator UI)
2. `apps/api` (NestJS + Prisma API)
3. Managed PostgreSQL database

Recommended topology:

1. Web: Vercel
2. API: VPS (Docker or Node process)
3. API ingress: Cloudflare Tunnel -> `api.aosanctuary.com`
4. DB: managed PostgreSQL (Neon/Supabase/RDS)
5. DNS + TLS: Cloudflare

Companion files:

1. API env template: `apps/api/.env.example`
2. Web env template: `apps/web/.env.example`
3. API staging skeleton: `apps/api/.env.staging.example`
4. API production skeleton: `apps/api/.env.production.example`
5. Web staging skeleton: `apps/web/.env.staging.example`
6. Web production skeleton: `apps/web/.env.production.example`
7. Launch-day checklist: `docs/GO_LIVE_CUTOVER_CHECKLIST.md`
8. Environment parity matrix: `docs/ENVIRONMENT_PARITY_MATRIX.md`

## 1. Production Environments

Create at least two environments:

1. `staging`
2. `production`

Never share database instances or JWT secrets across these environments.
Never point staging and production hostnames at the same live API runtime.

## 2. Environment Variables

## API (`apps/api`)

Required:

- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `AUTH_JWT_EXPIRES_IN` (example: `1h`)
- `APP_BASE_URL` (example: `https://app.aosanctuary.com`)
- `STAFF_APP_BASE_URL` if staff reset emails should point to a different staff portal origin
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (example: `https://api.aosanctuary.com/v1/auth/google/callback`)

Optional but recommended:

- `PORT` (defaults to `4000`)
- `NODE_ENV=production`
- `EMAIL_PROVIDER` (`gmail`, `resend`, or omit for auto-detect)
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `GOOGLE_WORKSPACE_CLIENT_EMAIL`
- `GOOGLE_WORKSPACE_DELEGATED_USER`
- `GOOGLE_WORKSPACE_CUSTOMER_ID`
- `GOOGLE_WORKSPACE_PRIVATE_KEY` for key-based auth
- `GOOGLE_WORKSPACE_KEYLESS=true` for keyless auth
- `AUTH_SEED_ADMIN_EMAIL`
- `AUTH_SEED_ADMIN_PASSWORD`
- `AUTH_SEED_ADMIN_NAME`

## Web (`apps/web`)

Required:

- `API_BASE_URL` (example: `https://api.aosanctuary.com/v1`)
- `SESSION_SECRET` (32+ char high-entropy value)
- `NODE_ENV=production`

## n8n (for auth monitoring)

Required for `docs/n8n/AO_OS_Auth_Anomaly_Detection_v1.0.0_dynamic-jwt.json`:

- `AO_OS_API_BASE` (example: `https://api.aosanctuary.com/v1`)
- `AO_OS_N8N_EMAIL`
- `AO_OS_N8N_PASSWORD`
- `AO_OS_ALERT_EMAIL`
- `NOTION_API_KEY`
- `NOTION_OPERATIONAL_LOG_DB_ID`

Optional:

- `NOTION_SECURITY_ALERT_DB_ID`
- `AO_OS_AUTH_FAILURE_THRESHOLD` (default `5`)
- `AO_OS_AUTH_ANOMALY_WINDOW_MINUTES` (default `15`)
- `AO_OS_AUTH_ALERT_COOLDOWN_MINUTES` (default `30`)

## Secrets Loading SOP

This section defines where each AO OS environment value belongs so deployment does not depend on memory or ad hoc decisions.

### Source-of-truth rule

- Keep `.env*.example` files in repo as naming reference only.
- Store actual secrets only in destination systems:
   - Vercel project environment settings
   - API host environment/secret store
   - n8n credentials or workflow env
   - Google Cloud Console
   - Cloudflare dashboard where applicable

Never commit real secrets.

### A. Web app (`apps/web`) -> Vercel

Load these into the Vercel project environment variables for the web app.

Required:

- `API_BASE_URL`
   - staging example: `https://api-staging.aosanctuary.com/v1`
   - production example: `https://api.aosanctuary.com/v1`
- `SESSION_SECRET`
   - long random secret
   - generate separately for staging and production

Optional:

- `NEXT_PUBLIC_API_BASE_URL` only if the frontend requires browser-visible API base config.

Notes:

- Anything prefixed with `NEXT_PUBLIC_` is exposed to the browser.
- Do not place API-only secrets in the Vercel web project.
- Keep staging and production values fully separate.

### B. API (`apps/api`) -> API host/VPS

Load these into the API runtime environment on the NestJS host.

Core runtime:

- `NODE_ENV`
- `PORT`
- `APP_BASE_URL`
- `DATABASE_URL`
- pooled DB URL if used by your provider
- `AUTH_JWT_SECRET`

Auth and Google:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Email and account flows:

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY` if using Resend
- `GOOGLE_WORKSPACE_CLIENT_EMAIL` if using Gmail API / provisioning
- `GOOGLE_WORKSPACE_DELEGATED_USER` if using Gmail API / provisioning
- `GOOGLE_WORKSPACE_CUSTOMER_ID` for Workspace provisioning scripts
- `GOOGLE_WORKSPACE_PRIVATE_KEY` for key-based Gmail API / provisioning
- `GOOGLE_WORKSPACE_KEYLESS=true` for keyless Gmail API / provisioning
- any reset/verify URL base values if separate from `APP_BASE_URL`

Optional bootstrap/admin:

- seed admin values if your current API runtime uses them

Notes:

- API secrets do not belong in Vercel unless also required by the web app.
- `AUTH_JWT_SECRET` must be unique per environment.
- Production should use strong, rotated secrets and managed secret storage.
- AO OS staff password reset emails now point to the web login route with a `resetToken` query string.
- The staff admin console expects the API deployment to support Workspace provisioning and suspend/reactivate sync before operators use the provisioning UI.

### C. Cloudflare -> DNS and Tunnel

Cloudflare stores routing and exposure config, not application secrets.

In Cloudflare:

- zone: `aosanctuary.com`
- DNS/hostname records
- Tunnel configuration
- public hostname mapping:
   - `api.aosanctuary.com` -> internal API service
   - optional staging: `api-staging.aosanctuary.com`

Notes:

- Cloudflare is not an application secret manager.
- Tunnel maps the public hostname to your internal API port.
- Confirm the hostname used here matches web/API env vars and Google redirect registration.
- `api-staging.aosanctuary.com` and `api.aosanctuary.com` must terminate at isolated runtimes. A single container behind both hostnames is not an acceptable release topology.

### D. Google OAuth -> Google Cloud Console

These are configured in Google Cloud, then copied into API host secrets.

In Google Cloud:

- OAuth client name
- authorized redirect URIs
- authorized origins if required

Must match deployed URLs.

Staging:

- app origin: `https://staging.aosanctuary.com`
- API callback: `https://api-staging.aosanctuary.com/v1/auth/google/callback`

Production:

- app origin: `https://aosanctuary.com` or `https://app.aosanctuary.com`
- API callback: `https://api.aosanctuary.com/v1/auth/google/callback`

Notes:

- Redirect URI mismatch is a common go-live failure.
- Treat Google client secret as API secret, not web secret.

### E. n8n -> Credentials and Workflow Env

Load these into n8n credentials or workflow-level env, depending on your deployment pattern.

Required:

- AO OS API base URL
- AO OS auth/JWT token or machine credential used by workflows
- Notion credentials
- Gmail credentials
- anomaly threshold variables
- cooldown variables

Common variable names:

- `AO_OS_API_BASE` (or `AO_OS_API_BASE_URL` for newer workflows)
- `AO_OS_AUTH_FAILURE_THRESHOLD`
- `AO_OS_AUTH_ANOMALY_WINDOW_MINUTES`
- `AO_OS_AUTH_ALERT_COOLDOWN_MINUTES`

Notes:

- n8n should call the public API endpoint, not localhost.
- Keep staging and production n8n credentials separated.
- Reuse workflow-documented variable names exactly.

### F. Environment separation rules

Staging is used for auth flow validation, migration rehearsal, callback testing, and deployment smoke tests.
Production is used only for live operator traffic and real credentials.

Hard rules:

- no shared JWT secrets
- no shared DBs
- no shared Google OAuth clients unless intentional
- no shared n8n alert destinations unless explicitly desired

### G. Pre-cutover verification

Before launch, verify all of the following agree:

- web API base URL (`API_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` if used)
- API `APP_BASE_URL`
- Cloudflare hostname
- Google redirect URI
- email reset/verify links
- n8n AO OS API base URL

If one value points to the wrong environment, auth and verification flows can fail.

For the staff admin flow, also verify these agree:

- `EMAIL_FROM`
- `GOOGLE_WORKSPACE_DELEGATED_USER`
- the actual sender mailbox or configured send-as alias in Gmail
- whether the environment is using `GOOGLE_WORKSPACE_PRIVATE_KEY` or `GOOGLE_WORKSPACE_KEYLESS=true`

## 3. GitHub Actions Secret Setup (`GH_TOKEN`)

The deploy workflow uses `GH_TOKEN` to authenticate `git fetch` on the VM using a temporary `.netrc` file.

Option A (recommended): run the helper script

```powershell
./scripts/Set-GhTokenSecret.ps1
```

What it does:

1. Detects the repository from git remote (for example, `jvr-beep/AO-OS`).
2. Prompts for your PAT securely (no terminal echo).
3. Tries `gh secret set` first.
4. Falls back to GitHub REST API with libsodium encryption if `gh` is unavailable.

Option B (manual): add secret in GitHub UI

1. Open repository settings: `Settings -> Secrets and variables -> Actions`.
2. Click `New repository secret`.
3. Name: `GH_TOKEN`.
4. Value: a PAT with repository access sufficient for Actions secret use and repo read.

## 4. Database Provisioning

1. Create managed Postgres instance.
2. Set production `DATABASE_URL` in API runtime.
3. From repo root, run production migrations:

```bash
pnpm prisma:generate
pnpm prisma migrate deploy --schema ./prisma/schema.prisma
```

If your deploy runner does not have root scripts installed, use Prisma directly:

```bash
pnpm prisma generate --schema ./prisma/schema.prisma
pnpm prisma migrate deploy --schema ./prisma/schema.prisma
```

4. Optional initial seed (only if explicitly desired):

```bash
pnpm prisma:seed
```

## 5. API Deploy

Docker path (recommended):

1. Copy API environment file on the host:

```bash
cp apps/api/.env.production.example apps/api/.env
```

2. Fill real production values in `apps/api/.env`.

3. Build and start API via Compose:

```bash
docker compose -f infra/docker/docker-compose.api.yml up -d --build
```

4. Verify health endpoint:

```bash
curl -i http://localhost:4000/v1/health
```

5. View runtime logs:

```bash
docker compose -f infra/docker/docker-compose.api.yml logs -f api
```

6. Run staff auth and Workspace smoke tests after deploy:

```bash
curl -i http://localhost:4000/v1/health
```

Then verify through the web app:

1. Admin login succeeds.
2. Staff roster loads.
3. Provision a test `@aosanctuary.com` user from `/staff`.
4. Confirm the Workspace user exists and alias creation succeeded if supplied.
5. Request a staff password reset from `/login` and confirm email delivery.
6. Deactivate the test user and confirm the Workspace account is suspended.
7. Reactivate the test user and confirm suspension is removed.

Node process path (alternate):

## Build

```bash
pnpm --filter api build
```

## Run (Node process)

```bash
node apps/api/dist/main.js
```

API listens on `:4000` and serves endpoints under `/v1/*`.

## Health check

```bash
curl -i http://localhost:4000/v1/health
```

## 6. Cloudflare Tunnel Setup (API Ingress)

Use existing config and credentials templates under `infra/cloudflared/`.

**Important: Credentials are not stored in this repo.**

1. Obtain tunnel credentials from Cloudflare dashboard
2. Place credentials file at `/root/.cloudflared/<TUNNEL_ID>.json` on the API host
3. Update `infra/cloudflared/config.yml` with your tunnel ID and hostname

See `infra/cloudflared/CREDENTIALS.md` for credential storage details.

Recommended sequence on the API host:

1. Ensure tunnel DNS route:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cloudflared/Ensure-CloudflaredDnsRoute.ps1 -TunnelName ao-os-api -Hostname api.aosanctuary.com
```

2. Install tunnel service:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cloudflared/Install-CloudflaredTunnelService.ps1 -TunnelName ao-os-api -HealthUrl https://api.aosanctuary.com/v1/health
```

3. Verify public health endpoint:

```bash
curl -i https://api.aosanctuary.com/v1/health
```

### Cloudflared Service Installation (Production)

For production, install cloudflared as a systemd service so it automatically restarts on reboot.

On the API host, run:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

Verify the service is running:

```bash
sudo systemctl status cloudflared
```

### Day-to-Day Cloudflared Operations

After you edit or update the config file at `/root/.cloudflared/config.yml`:

```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared
```

For development or quick testing (runs in foreground, logs to terminal):

```bash
cloudflared tunnel run ao-os-api
```

Common checks:

- **Health of tunnel**: `sudo systemctl status cloudflared`
- **Recent logs**: `sudo journalctl -u cloudflared -f`
- **Config validation**: Edit `infra/cloudflared/config.yml` and restart the service

## 7. Web Deploy (Vercel)

1. Connect repository to Vercel.
2. Configure project root to `apps/web`.
3. Add env vars:
   - `API_BASE_URL=https://api.aosanctuary.com/v1`
   - `SESSION_SECRET=<strong-secret>`
4. Deploy and verify login flow.

## 8. OAuth + Auth URLs

In Google Cloud console, set production redirect URI exactly:

- `https://api.aosanctuary.com/v1/auth/google/callback`

Also verify:

1. `APP_BASE_URL` points to real web origin.
2. Email links (`verify-email`, `reset-password`, `set-password`) resolve correctly.

## 9. n8n Deploy (Auth Monitoring)

1. Import workflow:
   - `docs/n8n/AO_OS_Auth_Anomaly_Detection_v1.0.0_dynamic-jwt.json`
2. Configure Gmail and Notion credentials.
3. Set env vars from section 2.
4. Run manually once and verify:
   - Notion anomaly records are created.
   - Gmail alert triggers only when not suppressed by cooldown.

## 10. Go-Live Checklist

1. Production DB backups enabled.
2. API deployed and `/v1/health` green internally and externally.
3. Cloudflare Tunnel service auto-start confirmed.
4. Web deployed and can authenticate against production API.
5. Google OAuth callback verified in production.
6. `AUTH_JWT_SECRET`, `SESSION_SECRET`, and DB creds rotated from defaults.
7. n8n auth anomaly workflow imported and tested.
8. Events polling access remains restricted to `admin` and `operations` roles.

## 11. Post-Launch Hardening

1. Add API rate limiting on auth endpoints.
2. Add centralized error logging and request tracing.
3. Add uptime checks for:
   - `https://api.aosanctuary.com/v1/health`
   - web root URL
4. Add daily review of auth anomaly Notion table.
5. Keep running integration suites in CI:
   - `test/integration/auth-observability.int-spec.ts`
   - `test/integration/events-poll-auth.int-spec.ts`
   - `test/integration/identity-convergence.int-spec.ts`
