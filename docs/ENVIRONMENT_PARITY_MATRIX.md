# AO OS Environment Parity Matrix

This matrix is used to confirm that staging and production are structurally aligned before cutover.

## Purpose

The goal is not to make staging and production identical in value.
The goal is to make them identical in shape, naming, routing, and expected behavior.

## 1. Application URLs

| Area | Staging | Production | Must Match Format? | Notes |
|---|---|---|---|---|
| Web app URL | `https://staging.aosanctuary.com` | `https://aosanctuary.com` or `https://app.aosanctuary.com` | Yes | Final canonical public web URL |
| API base URL | `https://api-staging.aosanctuary.com/v1` | `https://api.aosanctuary.com/v1` | Yes | Used by web and n8n |
| API root URL | `https://api-staging.aosanctuary.com` | `https://api.aosanctuary.com` | Yes | Used in callbacks and health checks |
| Health URL path | `/v1/health` | `/v1/health` | Yes | Same route structure |

## 2. Web Environment Variables

| Variable | Staging Present | Production Present | Same Name? | Notes |
|---|---|---|---|---|
| `API_BASE_URL` | Yes | Yes | Yes | AO OS current web runtime variable |
| `NEXT_PUBLIC_API_BASE_URL` | Optional | Optional | Yes | Use only if browser-exposed config is required |
| `SESSION_SECRET` | Yes | Yes | Yes | Different values per environment |
| `NODE_ENV` | Yes | Yes | Yes | `staging` or `production` |

## 3. API Environment Variables

| Variable | Staging Present | Production Present | Same Name? | Notes |
|---|---|---|---|---|
| `NODE_ENV` | Yes | Yes | Yes | `staging` or `production` |
| `PORT` | Yes | Yes | Yes | Internal service port |
| `APP_BASE_URL` | Yes | Yes | Yes | Must align with public web origin |
| `DATABASE_URL` | Yes | Yes | Yes | Different DBs |
| `AUTH_JWT_SECRET` | Yes | Yes | Yes | Never shared across environments |
| `AUTH_JWT_EXPIRES_IN` | Yes | Yes | Yes | Keep policy explicit |
| `GOOGLE_CLIENT_ID` | Yes | Yes | Yes | Usually separate clients |
| `GOOGLE_CLIENT_SECRET` | Yes | Yes | Yes | API-only secret |
| `GOOGLE_REDIRECT_URI` | Yes | Yes | Yes | Must match Google config exactly |
| `RESEND_API_KEY` or provider key | Yes | Yes | Yes | Separate credentials preferred |
| `EMAIL_FROM` | Yes | Yes | Yes | Confirm correct domain |
| `AUTH_SEED_ADMIN_*` | Optional | Optional | Yes | Only if supported and needed |

## 4. Database

| Check | Staging | Production | Must Be Separate? | Notes |
|---|---|---|---|---|
| Managed Postgres instance | Yes | Yes | Yes | No shared database |
| Backup enabled | Yes | Yes | Yes | Especially production |
| `prisma migrate deploy` path validated | Yes | Yes | Yes | Never use `migrate dev` in prod |
| Connection pooling configured | Yes | Yes | Preferred | Depends on provider |

## 5. Cloudflare and Edge

| Check | Staging | Production | Must Match Pattern? | Notes |
|---|---|---|---|---|
| DNS configured | Yes | Yes | Yes | Correct zone/hostnames |
| Tunnel configured | Yes | Yes | Yes | Public hostname to internal API |
| TLS/HTTPS active | Yes | Yes | Yes | Required |
| API hostname live | Yes | Yes | Yes | Used by web and n8n |

## 6. Google OAuth

| Check | Staging | Production | Must Match Pattern? | Notes |
|---|---|---|---|---|
| OAuth client exists | Yes | Yes | Preferred | Separate clients recommended |
| Redirect URI registered | Yes | Yes | Yes | Exact match required |
| Authorized origin registered | Yes | Yes | Yes | If used by your flow |
| Callback tested end-to-end | Yes | Yes | Yes | Required before launch |

## 7. Email and Auth Flows

| Flow | Staging Tested | Production Tested | Notes |
|---|---|---|---|
| Email verification | Yes | Before launch | Confirm correct link host |
| Password reset | Yes | Before launch | Confirm correct link host |
| Google login | Yes | Before launch | Confirm redirect works |
| Member password login | Yes | Before launch | Confirm sessions issued |
| Auth event emission | Yes | Before launch | Confirm observability path |

## 8. n8n and Automation

| Check | Staging | Production | Must Match Pattern? | Notes |
|---|---|---|---|---|
| AO OS API base URL set | Yes | Yes | Yes | Must point to public API |
| Auth credentials set | Yes | Yes | Yes | Do not share tokens |
| Notion credentials set | Yes | Yes | Yes | Separate if appropriate |
| Gmail credentials set | Yes | Yes | Yes | Verify sender |
| Threshold variables set | Yes | Yes | Yes | May differ intentionally |
| Cooldown variables set | Yes | Yes | Yes | May differ intentionally |

## 9. Security and Access

| Check | Staging | Production | Notes |
|---|---|---|---|
| CORS restricted to real web origin | Yes | Yes | No wildcard in production |
| Admin-only `/events/poll` access | Yes | Yes | Confirm role constraints |
| Login failure logging enabled | Yes | Yes | Required |
| Rate limiting enabled | Yes | Yes | Strongly recommended |

## 10. Release Readiness

| Item | Staging | Production | Notes |
|---|---|---|---|
| Build passes | Yes | Yes | Web and API |
| Migrations applied | Yes | Yes | DB in sync |
| Smoke tests pass | Yes | Yes | Auth, health, and core routes |
| Rollback plan ready | Yes | Yes | Required before launch |
| Launch owner assigned | Yes | Yes | Human accountability |

## Cutover Rule

Production cutover should not proceed unless:

1. Staging is green across auth, API, and automation.
2. Production values are loaded in the correct destination systems.
3. Google callbacks and email links point to production hostnames.
4. Smoke tests pass immediately after cutover.

If any of the above fails, stop launch and execute rollback or correction before opening access.
