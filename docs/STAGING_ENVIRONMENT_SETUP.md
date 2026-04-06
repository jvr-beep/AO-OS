# AO OS Staging Environment Setup

This document turns the repo's staging templates into a real reachable staging environment.

## Target topology

1. Web app: `https://staging.aosanctuary.com`
2. API: `https://api-staging.aosanctuary.com`
3. API health: `https://api-staging.aosanctuary.com/v1/health`
4. Database: separate staging Postgres instance
5. Tunnel: separate Cloudflare named tunnel for staging
6. Secrets: separate staging values for web, API, Google OAuth, Gmail/Workspace, and n8n

## What must exist

1. A dedicated staging VM or container host for the API.
2. A dedicated staging database.
3. A Cloudflare DNS record for `api-staging.aosanctuary.com`.
4. A web deployment target for `staging.aosanctuary.com`.
5. A Google OAuth staging redirect URI: `https://api-staging.aosanctuary.com/v1/auth/google/callback`.

## Hard separation rules

1. `api-staging.aosanctuary.com` must not point at the same running API container or process as `api.aosanctuary.com`.
2. Staging must use its own runtime env with `NODE_ENV=staging` and staging URL values.
3. Staging and production must not share the same `DATABASE_URL`, JWT secret, or Cloudflare tunnel token.
4. A rebuild or restart of staging must not interrupt production traffic.

## Files already prepared in repo

1. API env: `apps/api/.env.staging.example`
2. Web env: `apps/web/.env.staging.example`
3. Cloudflared staging env: `infra/cloudflared/.env.staging.example`
4. Cloudflared staging config: `infra/cloudflared/config.staging.yml.example`
5. VM smoke runner: `scripts/run-vm-post-deploy-smoke.ps1`
6. VM smoke script: `scripts/vm-post-deploy-smoke.sh`

## API host setup

1. Provision a Linux host and clone this repo to `~/AO-OS`.
2. Copy `apps/api/.env.staging.example` to `apps/api/.env` on the staging host.
3. Fill staging secrets only.
4. Copy `infra/cloudflared/config.staging.yml.example` to `/root/.cloudflared/config.yml` on the staging host.
5. Replace `STAGING_TUNNEL_ID` and ensure the credentials file exists at `/root/.cloudflared/<TUNNEL_ID>.json`.
6. Ensure Docker and cloudflared are installed on the staging host.

## Required staging values

### API

1. `NODE_ENV=staging`
2. `APP_BASE_URL=https://staging.aosanctuary.com`
3. `STAFF_APP_BASE_URL=https://staging.aosanctuary.com` if staff reset emails should use the staff portal origin explicitly
4. `GOOGLE_REDIRECT_URI=https://api-staging.aosanctuary.com/v1/auth/google/callback`
5. `EMAIL_PROVIDER=gmail` or your chosen staging provider
6. Staging-only `AUTH_JWT_SECRET`
7. Staging-only `DATABASE_URL`
8. Staging Workspace/Gmail settings if you want to validate staff provisioning and staff reset delivery

### Web

1. `API_BASE_URL=https://api-staging.aosanctuary.com/v1`
2. `WEB_BASE_URL=https://staging.aosanctuary.com`
3. Staging-only `SESSION_SECRET`

## Cloudflare tunnel setup

On a machine authenticated with cloudflared and allowed to manage DNS:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cloudflared/Ensure-CloudflaredDnsRoute.ps1 -TunnelName ao-os-api-staging -Hostname api-staging.aosanctuary.com -HealthUrl https://api-staging.aosanctuary.com/v1/health
```

On the staging API host, after `/root/.cloudflared/config.yml` is in place:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cloudflared/Install-CloudflaredTunnelService.ps1 -TunnelName ao-os-api-staging -ConfigPath C:\Users\<USER>\.cloudflared\config.yml -HealthUrl https://api-staging.aosanctuary.com/v1/health
```

If you are installing cloudflared directly on Linux instead of Windows, use the same tunnel name and the config copied from `infra/cloudflared/config.staging.yml.example`.

### Linux token-based install shortcut

If the staging host does not already have `/root/.cloudflared/<TUNNEL_ID>.json` and you are using the Cloudflare dashboard's connector install flow, the fastest recovery path is the token-based install shown on the tunnel page:

```bash
sudo cloudflared service install <TUNNEL_TOKEN>
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
sudo journalctl -u cloudflared -n 50 --no-pager
```

This path avoids the missing-credentials-json and missing-`cert.pem` errors that appear when trying to run the tunnel manually before the host has been fully bootstrapped.

## Web deployment

1. Create a staging project or branch environment in Vercel.
2. Point it at `apps/web`.
3. Load values from `apps/web/.env.staging.example` into the staging environment settings.
4. Set the staging domain to `staging.aosanctuary.com`.

## First deploy order

1. Deploy API to staging host.
2. Run database migrations with `pnpm prisma migrate deploy --schema ./prisma/schema.prisma`.
3. Bring up the API container.
4. Verify `https://api-staging.aosanctuary.com/v1/health`.
5. Deploy web with staging vars.
6. Verify `https://staging.aosanctuary.com/login`.
7. Run the smoke script.

## Smoke validation

From this machine, once a staging SSH alias exists:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-vm-post-deploy-smoke.ps1 -HostName <staging-ssh-alias> -ApiBase https://api-staging.aosanctuary.com -WebBase https://staging.aosanctuary.com -Build
```

The smoke script now validates:

1. API health
2. Web login route
3. Seed admin staff login
4. Authenticated `GET /v1/members`
5. Authenticated `GET /v1/staff-users`
6. Staff password reset request for the seed admin
7. Member signup and member password reset request
8. Unauthorized access rejection for `GET /v1/members`

## Troubleshooting

### `530` with Cloudflare `1033`

If `https://api-staging.aosanctuary.com/v1/health` returns Cloudflare `530` with `error code: 1033`, the staging tunnel is down. Check the `ao-os-api-staging` tunnel in Cloudflare Zero Trust, then verify `cloudflared` is installed and running on the staging host.

### `200` on health but `404 Cannot POST /v1/auth/staff-password-reset/request`

If health is green but the staff password reset endpoint returns `404`, staging is reachable but running an older API build that does not include the new staff reset routes. Deploy the branch that contains the auth hardening changes, rebuild the API container, and test again.

### Staging and production resolve to the same live API

If `api-staging.aosanctuary.com` and `api.aosanctuary.com` both hit the same running container or process, you do not have a real staging environment. Treat this as a deployment blocker.

Common indicators:

1. The staging host returns `NODE_ENV=production` or production `APP_BASE_URL` values.
2. Restarting or rebuilding the staging API causes a brief production outage.
3. Both hostnames are served by one Cloudflare tunnel token or one internal runtime.

Required fix:

1. Provision a separate staging VM or a fully isolated staging runtime on a different internal port and env file.
2. Route `api-staging.aosanctuary.com` to that staging runtime only.
3. Re-run the staging smoke tests before any production deploy.

### Docker build fails with `no space left on device`

If the API image build fails under `/var/lib/containerd/...` with `no space left on device`, free Docker cache before retrying:

```bash
docker builder prune -af
docker image prune -af
docker container prune -f
docker system prune -af
sudo apt-get clean
sudo journalctl --vacuum-time=7d
```

Avoid `docker system prune -af --volumes` unless you have confirmed staging does not need any existing Docker volumes.

## Missing external inputs

This repo cannot create these by itself:

1. The staging VM
2. The Cloudflare tunnel and tunnel credentials file
3. DNS ownership changes
4. Vercel project/domain setup
5. Staging Google OAuth client and delegated Workspace mailbox

Once you provide a staging host alias or reachable target, the deploy/smoke path above is ready to use.
