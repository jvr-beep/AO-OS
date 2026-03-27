# AO-OS Smoke Harness

Regression test suite validating core locker and credential workflows. The smoke harness verifies that fundamental operational flows remain unbroken as code evolves.

## Overview

**Scope**: Locker policy engine + credential lifecycle
**Test Count**: 16 cases
**Status**: ✓ Passing
**When to Run**: After locker or credential subsystem changes, before deployment

## Test Cases

| Case | Description | Validates |
|------|-------------|-----------|
| 1 | Issue Credential | Wristband creation, member assignment |
| 2 | Activate Credential | Status transition to `active` |
| 3 | Suspend Credential | Status transition to `suspended` |
| 4 | Replace Credential | Old credential retirement, new credential issuance |
| 5 | Evaluate Locker Policy | Access decision with valid credential + active session |
| 6 | Assign Locker | Successful locker assignment to member |
| 7 | Release Locker | Locker unassignment, return to `available` |
| 8 | Access Event History | Member locker policy event logging and retrieval |
| 9-12 | Hard-Block Denial (4 variants) | Deny access to maintenance/offline/forced_open/out_of_service lockers |
| 13-16 | Hard-Block Override (4 variants) | Staff override attempts properly rejected with correct HTTP status |

## Prerequisites

### 1. Database Setup

All migrations must be applied, including locker policy engine:
```bash
cd prisma
npx prisma migrate deploy
```

At least one `Location` row must exist in the database. If none exist, create one:
```bash
psql $DATABASE_URL -c "INSERT INTO \"Location\" (id, code, name, \"createdAt\") VALUES (gen_random_uuid(), 'HQ', 'Headquarters', NOW());"
```

Or use explicit `AO_SMOKE_LOCATION_ID` env var to override:
```bash
AO_SMOKE_LOCATION_ID=<location-id> pnpm smoke:locker-policy
```

### 2. API Server Running

Smoke harness makes HTTP requests to the API. Start the server before running:
```bash
pnpm dev
# In another terminal:
pnpm smoke:locker-policy
```

Default base URL: `http://localhost:4000/v1` (configurable via `AO_SMOKE_BASE_URL`)

### 3. Admin Credentials

The harness logs in as admin. Verify these credentials exist in your env:
- **Email**: `admin@ao-os.dev`
- **Password**: `AdminPass123!` (or whatever is configured in your database seed)

## Running the Smoke Harness

### Local Development

```bash
# Terminal 1: Start API server
pnpm dev

# Terminal 2: Run smoke test
pnpm smoke:locker-policy
```

Expected output:
```
=== AO-OS Smoke Pass — Locker Policy Engine + Credential Lifecycle ===

Using location <id> (HQ / Headquarters)
Authenticated as admin

OK [201] CASE 1 — Issue Credential
  NOTE: status: assigned

OK [200] CASE 2 — Activate Credential
  NOTE: status: active

...

SMOKE PASS SUMMARY
============================================================
PASS: 16  FAIL: 0  TOTAL: 16
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AO_SMOKE_BASE_URL` | `http://localhost:4000/v1` | API base URL for requests |
| `AO_SMOKE_LOCATION_ID` | Auto-detect first | Force specific Location ID (optional) |

### Exit Codes

- **0**: All smoke tests passed
- **1**: One or more tests failed, or setup error (missing Location, login failure, etc.)

## CI/CD Integration

Add to CI pipeline to gate deployments:

```yaml
- name: Run Smoke Harness
  run: pnpm smoke:locker-policy
  env:
    AO_SMOKE_BASE_URL: "http://localhost:4000/v1"
    # Ensure test database is populated with Location row
```

## Troubleshooting

### "No Location rows found"
**Solution**: Create at least one Location in the database, or set `AO_SMOKE_LOCATION_ID`:
```bash
AO_SMOKE_LOCATION_ID=<uuid> pnpm smoke:locker-policy
```

### "Login failed"
**Solution**: Verify admin credentials are correct:
- Check database for `user.email = 'admin@ao-os.dev'`
- Verify password matches your environment
- Ensure API is running and responding

### "Connect ECONNREFUSED 127.0.0.1:4000"
**Solution**: Start API server first:
```bash
pnpm dev  # in another terminal
```

### Test Timeout
**Solution**: Increase timeout or check API logs for errors:
```bash
timeout 60 pnpm smoke:locker-policy
```

## Maintenance

When adding new locker/credential features:

1. Add new test case to `locker-policy-smoke.mjs`
2. Document the case in this README (test cases table above)
3. Increment `TOTAL` in expected PASS/FAIL output
4. Verify smoke passes before merging to main
5. Update CHANGELOG with new case description

## References

- [Locker Policy Engine](../../src/lockers/README.md)
- [Credential Lifecycle](../../src/wristbands/README.md)
- [State Transitions](../../../STATE_TRANSITIONS.md)
