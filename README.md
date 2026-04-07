# AO-OS
AO OS monorepo for membership, wristbands, access control, bookings, transactions, and operations tooling.

## Isolated-Release VM Deploy

Use `scripts/deploy-isolated-api-release.ps1` to roll out a new API version to a VM without touching the live repo directory directly. The script clones a clean copy of the repo into a temp directory, overlays your env/compose files, rebuilds the API container, verifies health and key routes, optionally seeds facility topology, prints Prisma floor/zone counts, then removes the temp directory.

```powershell
# Full deploy with topology seed
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-isolated-api-release.ps1 `
  -HostName ao-os-api-gcp -SeedFacilityTopology

# Preview commands without executing
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-isolated-api-release.ps1 `
  -DryRun -SeedFacilityTopology

# Re-run verification and seed without rebuilding
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-isolated-api-release.ps1 `
  -HostName ao-os-api-gcp -SkipBuild -SeedFacilityTopology
```

Key switches:

| Switch | Effect |
|--------|--------|
| `-HostName` | SSH host alias or IP (default: `ao-os-api`) |
| `-SeedFacilityTopology` | Run `prisma/seed-facility-topology.ts` after the build |
| `-SkipBuild` | Skip `docker compose up --build`; useful to rerun checks or seed only |
| `-KeepReleaseRepo` | Leave the temp clone on the VM for inspection |
| `-DryRun` | Print all SSH/SCP commands without executing them |
| `-LocalEnvOverlay` | Local `.env` file to copy onto the VM before building |
| `-LocalComposeOverride` | Local compose override file to copy onto the VM |

Prerequisites: `ssh ao-os-api-gcp` must succeed from your local machine (key loaded, alias in `~/.ssh/config`).

---

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
