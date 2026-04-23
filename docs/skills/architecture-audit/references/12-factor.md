# 12-factor App — audit reference

Heroku's 12-factor app methodology. Aimed at services deployed to a cloud / container platform. Walk each factor, look for explicit evidence of compliance or violation.

## I. Codebase
One codebase tracked in version control, many deploys.

- **Check:** Is the whole system in one repo or split? If split, are services genuinely independent or forcibly decoupled? Is there a monorepo tool (Turborepo, Nx) or vanilla?
- **Violation signal:** Same code copy-pasted across repos. Orphaned forks. "Hotfix" branches that never merge back.

## II. Dependencies
Explicitly declare and isolate dependencies.

- **Check:** Lockfile committed (`package-lock.json`, `yarn.lock`, `poetry.lock`, `go.sum`)? No implicit system packages assumed? Container image pins versions?
- **Violation signal:** `npm install` without lockfile commit. `FROM python:latest` in Dockerfile. Global installs.

## III. Config
Store config in the environment.

- **Check:** Config lives in env vars, not hardcoded. `.env.example` documents what's needed. Secrets referenced from a secret manager, not pasted into env files committed to the repo.
- **Violation signal:** Hardcoded URLs, API keys, feature flags in source. Different code paths for "dev" vs. "prod" based on hostname checks.

## IV. Backing Services
Treat backing services (DB, cache, external APIs) as attached resources.

- **Check:** Swapping a backing service requires only a config change, not a code change. DB URL from env, not code.
- **Violation signal:** Hardcoded service endpoints. Different code for Postgres-dev vs. Postgres-prod.

## V. Build, release, run
Strictly separate build and run stages.

- **Check:** Build produces an artifact (container image, bundle). Release = artifact + config. Run uses the released artifact without rebuilding.
- **Violation signal:** `npm install` happens at container startup. Production changes require running a build on the live server.

## VI. Processes
Execute the app as one or more stateless processes.

- **Check:** No local filesystem state. No in-memory session state (use Redis / similar). Process can be killed and restarted without data loss.
- **Violation signal:** Session data written to local disk. Uploads written to local volume that isn't a mounted persistent store.

## VII. Port binding
Export services via port binding.

- **Check:** App binds to a port from env (`PORT`), not a hardcoded one. No reliance on a specific web server being on the host (e.g., Apache).
- **Violation signal:** Hardcoded `app.listen(3000)`. Reverse-proxy config baked into the image.

## VIII. Concurrency
Scale out via the process model.

- **Check:** Can run multiple instances behind a load balancer. Heavy work runs in background workers (queue-backed) not in request handlers.
- **Violation signal:** Singleton behavior that breaks at N>1 instances. Cron-style jobs running inside web processes.

## IX. Disposability
Maximize robustness with fast startup and graceful shutdown.

- **Check:** Startup <10s. Graceful shutdown on SIGTERM — finish in-flight requests, flush logs, close DB connections.
- **Violation signal:** 60s+ startup. SIGTERM drops requests. No shutdown hooks.

## X. Dev/prod parity
Keep development, staging, and production as similar as possible.

- **Check:** Same DB engine (Postgres-dev matches Postgres-prod). Same secret management pattern. Same language runtime version across envs.
- **Violation signal:** SQLite in dev + Postgres in prod. "Works on my machine" failure modes.

## XI. Logs
Treat logs as event streams.

- **Check:** App writes to stdout. Log aggregation done by the platform, not the app. Structured logs (JSON).
- **Violation signal:** App writes to `/var/log/app.log`. App rotates its own logs. Free-form logs with no structure.

## XII. Admin processes
Run admin / management tasks as one-off processes.

- **Check:** Migrations, one-off scripts run in the same environment as the app, using the same code. Not SSH-into-prod-and-run-a-script.
- **Violation signal:** Migrations run by humans. Ad-hoc scripts with no version control. "SSH to prod" as a normal workflow.

## Scoring

For each factor: **Pass / Partial / Fail / N/A**. A modern system should hit 10/12 clean. "Partial" on several factors is more common than "Fail" — note the specific gap.
