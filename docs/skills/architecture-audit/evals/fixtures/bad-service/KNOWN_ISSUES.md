# Known issues in this fixture (graders reference)

This file lists every intentional flaw seeded into `bad-service/`. Used by the grading step to check that the architecture-audit skill finds them. Finding rate = issues found / issues seeded.

## Critical

1. **Secrets in repo** — `.env.production` committed with live-looking DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, SENDGRID_API_KEY. (OWASP V2, GCP Security, 12-factor III)
2. **Hardcoded DB connection string with credentials** — `src/server.js:9` — `postgres://admin:hunter2@...`. (OWASP V2, 12-factor III)
3. **Hardcoded JWT secret** — `src/server.js:17` — `const JWT_SECRET = "super-secret-..."`. (OWASP V2, 12-factor III)
4. **SQL injection via string concat** — `src/server.js:33` (login query) and `src/server.js:50` (orders query). (OWASP V5)
5. **SHA-1 password hashing** — `src/server.js:28`. (OWASP V2)
6. **Code injection via eval** — `src/server.js:58` — `eval(req.body.code)`. (OWASP V5)
7. **IDOR on `/orders/:id`** — `src/server.js:48-52` — no authorization check. (OWASP V4)

## High

8. **CORS wildcard with credentials** — `src/server.js:20-23`. (OWASP, GCP Security)
9. **JWT with no expiry** — `src/server.js:41` — `jwt.sign` missing `expiresIn`. (OWASP V3)
10. **Non-secure session cookie** — `src/server.js:44` — no `HttpOnly`, `Secure`, or `SameSite` flags. (OWASP V3)
11. **Global in-memory session store** — `src/server.js:14` — breaks horizontal scaling. (12-factor VI, GCP Reliability)
12. **No rate limiting on `/login`** — entire `src/server.js`. (OWASP V2, GCP Security)
13. **No health endpoint** — entire `src/server.js`. (GCP Reliability, CNCF Observability)
14. **`FROM node:latest`** — `Dockerfile:1` — no version pinning. (12-factor II)
15. **Deploy script = SSH + git pull** — `scripts/deploy.sh` — no CI/CD, no build artifact. (GCP Ops Excellence, CNCF Build & Deploy L1, 12-factor V)
16. **Wildcard dependency versions** — `package.json` — `express: "*"`. (12-factor II)
17. **Outdated major-version dependency** — `package.json` — `pg: ^7.0.0` (current major is 8+). (GCP Security dep scanning)

## Medium

18. **`console.log` as logging** — `src/server.js:63`. (GCP Ops, 12-factor XI)
19. **No graceful shutdown** — `src/server.js:64` — `app.listen(3000)` without SIGTERM handling. (12-factor IX)
20. **Hardcoded port** — `src/server.js:64` — not from env. (12-factor VII)
21. **No error handling** — every handler assumes happy path. (GCP Reliability)
22. **No tests directory** — entire repo. (GCP Ops Excellence)

## Low

23. **No README** — repo root. (GCP Ops Excellence)
24. **No `.gitignore`** — repo root (wouldn't have stopped `.env.production` but signals carelessness). (12-factor)

## Total seeded

7 Critical · 10 High · 5 Medium · 2 Low = **24 seeded issues**
