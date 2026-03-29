# AO OS Go-Live Cutover Checklist

Use this on launch day to move from staging to production safely.

## T-24h Prep

1. Confirm production DNS records exist in Cloudflare.
2. Confirm managed Postgres backups and retention are enabled.
3. Confirm production secrets are present for API and web.
4. Confirm Google OAuth production callback URI is configured.
5. Confirm n8n anomaly workflow is imported and credentials are configured.

## T-60m Pre-Cutover

1. Freeze non-critical schema/code changes.
2. Deploy API artifact to production host (do not switch traffic yet).
3. Run production migrations:
   - `pnpm prisma generate --schema ./prisma/schema.prisma`
   - `pnpm prisma migrate deploy --schema ./prisma/schema.prisma`
4. Validate API locally on host:
   - `curl -i http://localhost:4000/v1/health`
5. Ensure cloudflared tunnel service is running.

## T-30m Validation

1. Validate public API endpoint:
   - `curl -i https://api.aosanctuary.com/v1/health`
2. Deploy web app (Vercel) with production vars.
3. Validate operator login from web UI.
4. Validate auth flows:
   - staff login
   - member password login
   - Google callback path
   - password reset email link

## Cutover

1. Point production web to `API_BASE_URL=https://api.aosanctuary.com/v1`.
2. Announce production open to operators.
3. Trigger manual run of n8n auth anomaly workflow.
4. Verify Notion receives anomaly records (or empty run with no errors).

## T+15m Smoke

1. `GET /v1/health` returns 200.
2. Staff can sign in and load dashboard.
3. Protected endpoint authorization works:
   - admin/operations can access events polling
   - front desk denied where expected
4. Event polling continues to operate with no 401 guard regressions.

## T+60m Stability

1. Check API logs for auth errors and 5xx spikes.
2. Confirm no unexpected migration/runtime errors.
3. Confirm tunnel health remains stable.
4. Confirm n8n cooldown suppression is preventing alert spam.

## Rollback Triggers

1. Public health check failing > 5 minutes.
2. Widespread auth failures affecting operators.
3. Migration-induced runtime errors blocking core flows.

## Rollback Actions

1. Roll web deployment back to previous release.
2. Roll API deployment back to previous image/build.
3. Keep database unchanged unless emergency restore is required.
4. Announce incident and pause new changes.

## Signoff

1. Engineering signoff.
2. Operations signoff.
3. Security signoff (auth + anomaly monitoring active).
