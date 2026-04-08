# AO-OS

AO OS monorepo for membership, wristbands, access control, bookings, transactions, and operations tooling.

## Locker Policy Smoke Harness

Use the repo-owned smoke script for locker-policy and credential-lifecycle regression checks:

`pnpm smoke:locker-policy`

Prerequisites:

- API is running at `http://localhost:4000` (or set `AO_SMOKE_BASE_URL`)
- Prisma migrations are applied
- At least one `Location` row exists in the database

Location selection behavior:

- If `AO_SMOKE_LOCATION_ID` is set, the script validates and uses that Location
- If not set, the script automatically uses the first existing Location
- If no Location exists, the script fails fast with setup guidance

Override verification coverage includes all non-bypassable hard-block statuses:

- `maintenance`
- `offline`
- `forced_open`
- `out_of_service`

## Isolated API Release

Use the repo-owned isolated deploy script when the VM checkout is dirty or when you need to ship a narrow API change without pulling unrelated remote edits.

Example:

`powershell -ExecutionPolicy Bypass -File .\scripts\deploy-isolated-api-release.ps1 -HostName ao-os-api-gcp -SeedFacilityTopology`

For staging or any long-lived VM checkout that may be on the wrong branch, pass an explicit git ref so the isolated release is built from the intended branch or commit instead of the host checkout's current branch:

`powershell -ExecutionPolicy Bypass -File .\scripts\deploy-isolated-api-release.ps1 -HostName ao-os-api-staging -RemoteGitRef origin/copilot/manage-cloudflare-vercel-gcp -SkipOverlay -SeedFacilityTopology -ApiBase https://api-staging.aosanctuary.com -WebBase https://staging.aosanctuary.com`

What it does:

- clones the VM repo into a temporary isolated release directory
- optionally checks out an explicit git ref inside that isolated release clone
- optionally copies only the local overlay files listed in the script
- rebuilds the API container from that isolated directory
- optionally runs the production-safe AO Sanctuary topology seed
- verifies `/v1/health` and verifies `/v1/floor-plans` returns an auth response
- removes the isolated release directory unless `-KeepReleaseRepo` is passed

Use `-SkipOverlay` when you want the deployment to come entirely from the pushed remote branch and do not want stale local workspace files copied over the isolated release checkout.
