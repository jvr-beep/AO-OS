# AO-OS
AO OS monorepo for membership, wristbands, access control, bookings, transactions, and operations tooling.

## Integration Guides

- **SmartBear SwaggerHub**: `docs/SMARTBEAR_SWAGGERHUB_SETUP.md` — Import the OpenAPI spec, sync with GitHub, and test endpoints interactively
- **N8N Cloud + Notion**: `docs/N8N_CLOUD_NOTION_SETUP.md` — Poll AO OS events and log them to Notion with Gmail alerts
- **JWT Tokens**: `docs/GET_JWT_TOKEN_FOR_N8N.md` — How to obtain a Bearer token for API access

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
