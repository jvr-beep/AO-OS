# Google Cloud Architecture Framework — audit reference

Use this reference during the GCP Architecture phase of the audit. Five pillars. For each, walk the key dimensions and look for specific evidence.

## Pillar 1: Operational Excellence

Run a system you can observe, deploy, and recover. Evidence you're looking for:

- **Deployment pipeline** — is there CI/CD? Where is it defined? Is it branch-protected? Can a single person deploy to prod alone? Is there a staging env that mirrors prod?
- **Observability** — logs, metrics, traces. Structured logging (JSON) or free-form? Log aggregation destination? Metrics — Datadog / Cloud Monitoring / Prometheus? Are they actually wired up or just imported?
- **Alerting** — alerts defined? Thresholds calibrated? On-call rotation? Runbooks for common alerts?
- **Incident response** — post-incident reviews? Incident log / docs?
- **Automation** — how many manual steps to deploy / rollback / rotate a secret? Target = 1 command per action.
- **Documentation** — README, ADRs (Architecture Decision Records), runbooks.

### Red flags
- Deploys happen from local laptops
- `console.log` / `print` as primary logging
- Secrets rotated "when we remember"
- No rollback procedure documented
- `main` branch auto-deploys without PR / review

## Pillar 2: Security

Security posture — auth, authz, secrets, data, network. Walk each area explicitly.

- **Identity / auth** — who can access what? IAM principals, service accounts, API keys. Least privilege actually enforced, or wildcard roles everywhere?
- **Secrets management** — env vars in `.env` files checked into repo? GCP Secret Manager / Vault / Doppler? Rotation cadence?
- **Network** — public vs. private endpoints. VPC / firewalls. TLS everywhere? Cert rotation automated?
- **Data** — encryption at rest (CMEK vs. default), in transit. PII handling. Backup + restore tested.
- **Application-layer** — input validation, output encoding, CSRF / XSS / SQLi mitigations. See `owasp-asvs.md` for the deep security walkthrough — this pillar stays at the architectural level.
- **Dependency security** — lockfiles committed, dependency scanning (Dependabot, Snyk), supply-chain attestation.
- **Audit logging** — who did what, when? Immutable audit trail?

### Red flags
- `.env.production` in repo history
- `owner` or `editor` IAM roles on service accounts
- API keys hardcoded in source or in CI variables without rotation
- No dependency scanning
- Public Cloud Storage buckets (check with `gcloud storage buckets list`)
- HTTP endpoints (non-TLS) anywhere reachable

## Pillar 3: Reliability

System stays up when things go wrong.

- **Redundancy** — single-region single-zone vs. multi-region. Load balancer → backend pool of 1 is a common trap.
- **Failure modes** — what happens when a dependency is down? Circuit breakers, timeouts, retries (with backoff).
- **Rate limits** — both enforced (you rate-limit your callers) and respected (you back off your dependencies).
- **Graceful degradation** — when a non-critical dependency fails, does the core flow still work?
- **SLOs / error budgets** — defined? Tracked? Visible to the team?
- **Recovery** — backup cadence, restore drill, RPO / RTO documented.
- **Health checks** — actually check health (DB connectivity, auth, downstream) or just `200 OK` from a static handler?

### Red flags
- No health endpoint
- Health endpoint that returns 200 when DB is down
- Retry logic without exponential backoff (hammer pattern)
- No timeout on outbound HTTP calls
- Single zone / single region for production workloads
- "Backup runs nightly" but no one has ever tested restore

## Pillar 4: Performance Efficiency

Get the work done without wasting resources.

- **Right-sizing** — instance types, DB tier, container CPU/mem requests + limits. Over-provisioning = cost; under-provisioning = latency / OOM.
- **Caching** — CDN for static assets, Redis / Memorystore for hot data, query-result caching.
- **Database** — indexes on query patterns, N+1 query avoidance, read replicas for heavy-read workloads.
- **Async processing** — long-running work via queue (Pub/Sub, Cloud Tasks) rather than blocking web requests.
- **Cold starts** — serverless functions, lambdas. Minimize or warm up.
- **Frontend** — bundle size, code splitting, image optimization, Core Web Vitals.

### Red flags
- Synchronous long-running work in HTTP request handlers
- No CDN in front of static content
- Missing indexes (evidenced by slow-query logs or ORM-generated scans)
- Full-table scans in production queries

## Pillar 5: Cost Optimization

Spend proportional to value.

- **Cost visibility** — monthly bill breakdown available? By service, by env (prod vs. staging vs. dev)?
- **Orphaned resources** — old dev envs, unused buckets, idle VMs, forgotten Cloud Run revisions.
- **Tier alignment** — expensive services used for dev/test traffic? e.g., Cloud SQL High Availability in dev.
- **Reserved / committed use** — for known-stable workloads, committed-use discounts.
- **Staging / dev env hygiene** — auto-shutdown nights / weekends?
- **Logging / monitoring cost** — ironically often a top line item. Sampling? Retention?

### Red flags
- No cost alerts configured
- Dev env left running 24/7
- Log retention set to default 30d/90d for high-volume debug logs
- Multi-region storage for single-region workloads
