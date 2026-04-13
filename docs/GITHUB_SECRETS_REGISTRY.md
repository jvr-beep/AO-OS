# AO OS — GitHub Actions Secrets Registry

This document is the authoritative reference for every secret stored under
`Settings → Secrets and variables → Actions` in the `jvr-beep/AO-OS` repository.

Secrets are **never** committed to the repo. This file records the purpose,
destination system, and workflow usage of each secret so that any team member or
agent can understand what to set and why.

---

## How to read this table

| Column | Meaning |
|---|---|
| **Secret name** | Exact name as it appears in GitHub Actions secrets |
| **Service / system** | The external platform the value belongs to |
| **Used by** | Workflows or runtime systems that consume it |
| **Purpose** | What the value does |
| **Where to find / rotate** | Where to retrieve or regenerate the value |

---

## Secrets registry

### AI / LLM

| Secret name | Service / system | Used by | Purpose | Where to find / rotate |
|---|---|---|---|---|
| `AI_GATEWAY_API_KEY` | AI gateway proxy (e.g. OpenRouter, LiteLLM, or similar) | Agent workflows, future routing layer | Authenticates requests to the centralised AI gateway that routes to multiple LLM backends | AI gateway dashboard → API keys |
| `CLAUDE_AO_KEY` | Anthropic Claude | Agent workflows, Copilot integrations, `secret-smoke.yml` | Anthropic API key scoped to AO Sanctuary; used when calling Claude models directly | [console.anthropic.com](https://console.anthropic.com) → API keys |
| `OPEN_AI_AO` | OpenAI | Agent workflows, Copilot integrations | OpenAI API key scoped to AO Sanctuary | [platform.openai.com](https://platform.openai.com) → API keys |
| `ELEVENLABS_AO_KEY` | ElevenLabs | Future voice / audio workflows, `secret-smoke.yml` | ElevenLabs API key for AI voice generation (member-facing or staff notifications) | [elevenlabs.io](https://elevenlabs.io) → Profile → API key |

---

### Infrastructure — GCP

| Secret name | Service / system | Used by | Purpose | Where to find / rotate |
|---|---|---|---|---|
| `AO_OS_GCP_KEY` | Google Cloud Platform | Deploy pipeline, GCP service calls | Restricted GCP API key (`GCP_COMPUTE_KEY_AO`) with access to ~39 GCP APIs; used for direct GCP service calls from CI/CD or the API server | GCP Console → `ao-os-vm` project → APIs & Services → Credentials |
| `GCP_INTEGRATIONS` | Google Cloud Platform | GCP integration workflows | Service account JSON key used for broader GCP integration tasks (separate from the compute key) | GCP Console → IAM & Admin → Service accounts |
| `AO_OS_API_HEALTH` | Google Cloud Platform | Self-heal / health monitor workflows | Service account JSON key (`ao-os-health@ao-os-vm.iam.gserviceaccount.com`) used by GitHub Actions to perform GCP-side health checks | GCP Console → IAM & Admin → Service accounts → `ao-os-health` |

---

### Infrastructure — Cloudflare & Vercel

| Secret name | Service / system | Used by | Purpose | Where to find / rotate |
|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare | Deploy pipeline, tunnel management scripts, `secret-smoke.yml` | Scoped API token for zone/DNS management and Cloudflare Tunnel operations (`api.aosanctuary.com` ingress) | Cloudflare dashboard → My Profile → API Tokens |
| `VERCEL_TOKEN` | Vercel | Web deploy pipeline | Authenticates GitHub Actions (or CLI) to deploy `apps/web` (Next.js operator UI) to Vercel | Vercel dashboard → Settings → Tokens |

---

### Infrastructure — VM & Database

| Secret name | Service / system | Used by | Purpose | Where to find / rotate |
|---|---|---|---|---|
| `AO_PRISMA_KEY` | Prisma Data Platform (Accelerate / Pulse) | API server runtime, `secret-smoke.yml` | Prisma Data Platform API key; used for Prisma Accelerate connection pooling or Prisma Pulse real-time subscriptions | [console.prisma.io](https://console.prisma.io) → Projects → API keys |

> **Note:** VM secrets `VM_HOST`, `VM_USER`, and `VM_SSH_KEY` are required by `deploy.yml`
> but are not shown in this screenshot — they may appear further down the list or may be
> configured as environment-level secrets under the `production` environment.

---

### Monitoring & Observability

| Secret name | Service / system | Used by | Purpose | Where to find / rotate |
|---|---|---|---|---|
| `AO_DATA_DOG_KEY` | Datadog | `deploy.yml` | Datadog API key; injected into `apps/api/.env` as `AO_DATA_DOG_KEY` on each deploy. Enables APM / error forwarding from the API server | [app.datadoghq.com](https://app.datadoghq.com) → Organization settings → API keys |

> **Note:** `AO_OS_MONITOR_KEY` (used by `self-heal.yml` to authenticate calls to
> `GET /v1/ops/exceptions/monitor`) must also be set. It must match `MONITOR_API_KEY` in
> `apps/api/.env`. See `apps/api/.env.example` for details.

---

### Automation — n8n

| Secret name | Service / system | Used by | Purpose | Where to find / rotate |
|---|---|---|---|---|
| `N8N_AO_OS` | n8n Cloud | n8n workflows | Base URL or instance identifier for the AO OS n8n Cloud workspace | n8n Cloud dashboard → Settings |
| `N8N_API_KEY` | n8n Cloud | `deploy.yml`, `health-monitor.yml` | API key used to authenticate webhook calls sent **to** n8n (passed as `X-N8N-API-KEY` header). Required for deploy-failure and health-degraded notifications | n8n Cloud → Settings → API → Create API key |
| `N8N_WEBHOOK_URL` | n8n Cloud | `deploy.yml`, `health-monitor.yml` | Full webhook URL for the n8n workflow that receives production incident and deploy-failure events | n8n Cloud → Workflow → Webhook trigger node → copy URL |

---

### Design & Frontend tooling

| Secret name | Service / system | Used by | Purpose | Where to find / rotate |
|---|---|---|---|---|
| `FIGMA_AO_KEY` | Figma | Design-to-code or asset export workflows, `secret-smoke.yml` | Figma personal access token for accessing AO Sanctuary design files programmatically | Figma → Account settings → Personal access tokens |
| `FRAMER_API_TOKEN` | Framer | Framer publish / sync workflows, `secret-smoke.yml` | Framer API token for publishing or syncing the public-facing AO Sanctuary website (framer-hosted) | Framer project → Site settings → Integrations |
| `AO_WEB_FRAMER_KEY` | Framer | Framer site workflows, `secret-smoke.yml` | Secondary or scoped Framer key; may be used for a specific site or component library separate from `FRAMER_API_TOKEN` | Framer project → Site settings → Integrations |

---

### API / Access keys

| Secret name | Service / system | Used by | Purpose | Where to find / rotate |
|---|---|---|---|---|
| `API_KEY_JVR_AOSANCTUARY` | AO OS API | External integrations, personal scripts, `secret-smoke.yml` | A named API key issued by the AO OS API itself for Jason's personal account or an integration service account (`JVR_AOSANCTUARY`). Used when a full JWT auth flow is not practical | AO OS admin panel or `POST /v1/auth/login` then issue a persistent token |
| `SMARTBEAR_ACCESS_KEY` | SmartBear / SwaggerHub | `deploy.yml` | SwaggerHub CLI token; mapped to `SWAGGERHUB_TOKEN` env var. Used to validate and publish the OpenAPI spec (`openapi/ao-os.openapi.yaml`) to SwaggerHub on every production deploy | [app.swaggerhub.com](https://app.swaggerhub.com) → Settings → API keys |

---

## Secrets required by workflows but not shown in this screenshot

The following secrets are consumed by existing workflows and must also be set:

| Secret name | Required by | Purpose |
|---|---|---|
| `GH_TOKEN` | `deploy.yml` | GitHub PAT used on the VM to `git pull` the latest code during SSH deploy |
| `VM_HOST` | `deploy.yml` | External IP of the **production** API server (`ao-os-api`, `us-central1-c`) — see GCP instance details below |
| `VM_HOST_STAGING` | future staging deploy workflow | External IP of the **staging** API server (`ao-os-api-staging`, `us-central1-a`) — see GCP instance details below |
| `VM_USER` | `deploy.yml` | SSH user on the API server (typically `root` or the provisioned deploy user) |
| `VM_SSH_KEY` | `deploy.yml` | Private SSH key for connecting to the API server |
| `AO_OS_MONITOR_KEY` | `self-heal.yml` | Shared key authenticating the self-heal monitor against `GET /v1/ops/exceptions/monitor`; must match `MONITOR_API_KEY` in `apps/api/.env` |
| `AUTH_SEED_ADMIN_PASSWORD` | `locker-credential-smoke.yml` | Admin password used when seeding the smoke-test database |
| `SLACK_WEBHOOK_URL` | `secret-smoke.yml` | Incoming Webhook URL for posting success/failure notifications to Slack; optional — notifications are skipped if unset. Create at [api.slack.com/apps](https://api.slack.com/apps) → Incoming Webhooks |

### GCP VM instance reference

These are the GCP Compute Engine instances in project `ao-os-vm` as of 2026-04-12.
Use the **external IP** in GitHub secrets so workflows can reach the VMs over the internet.
Use the **internal IP** only if a workflow runs inside the same GCP VPC (rare).

| Secret name | GCP instance | Zone | Internal IP | External IP |
|---|---|---|---|---|
| `VM_HOST` | `ao-os-api` (production) | `us-central1-c` | `10.128.0.2` | `34.41.70.216` |
| `VM_HOST_STAGING` | `ao-os-api-staging` | `us-central1-a` | `10.128.0.3` | `34.58.72.109` |

> **Note:** External IPs assigned to preemptible or standard VMs can change if the instance
> is stopped and restarted. If that happens, re-run `gcloud compute instances list` and update
> the secret value. Consider reserving a static IP in GCP to make this permanent.

#### How to set these secrets (one-time setup)

Using the GitHub CLI (recommended — run locally where you have `gh` auth):

```bash
gh secret set VM_HOST        --body "34.41.70.216"  --repo jvr-beep/AO-OS
gh secret set VM_HOST_STAGING --body "34.58.72.109" --repo jvr-beep/AO-OS
```

Or via GitHub UI:

1. Open `Settings → Secrets and variables → Actions` in the repository.
2. Click **New repository secret**.
3. Name: `VM_HOST`, Value: `34.41.70.216` → Save.
4. Repeat for `VM_HOST_STAGING` with value `34.58.72.109`.

---

## Secret rotation policy

- Rotate all secrets if a team member with access leaves.
- Rotate `AUTH_JWT_SECRET`, `SESSION_SECRET`, and DB credentials on any suspected
  compromise.
- Rotate AI keys (Claude, OpenAI, ElevenLabs, AI Gateway) quarterly or sooner if usage
  anomalies appear in provider dashboards.
- `GH_TOKEN` should be a fine-grained PAT with the minimum required scopes; rotate
  annually or on role change.
- After rotating any key that is injected into `apps/api/.env` via `deploy.yml`, trigger
  a manual deploy run so the new value takes effect on the server.

---

## Related files

| File | Purpose |
|---|---|
| `apps/api/.env.example` | Template for all API server env vars; includes the mapping between GitHub secret names and `.env` key names |
| `docs/DEPLOYMENT_RUNBOOK.md` | Step-by-step deploy guide; references which secrets go to which system |
| `docs/ENVIRONMENT_PARITY_MATRIX.md` | Confirms staging and production env var parity before cutover |
| `.github/workflows/deploy.yml` | Production deploy — uses `GH_TOKEN`, `VM_*`, `AO_DATA_DOG_KEY`, `SMARTBEAR_ACCESS_KEY`, `N8N_*` |
| `.github/workflows/health-monitor.yml` | Production health check every 5 min — uses `N8N_WEBHOOK_URL`, `N8N_API_KEY` |
| `.github/workflows/self-heal.yml` | Exception monitor every 5 min — uses `AO_OS_MONITOR_KEY` |
| `.github/workflows/locker-credential-smoke.yml` | On-demand smoke test — uses `AUTH_SEED_ADMIN_PASSWORD` |
| `.github/workflows/secret-smoke.yml` | Weekly (Mon 09:00 UTC) + on-demand secret validation — presence check for all 10 integration secrets; live API check for `CLAUDE_AO_KEY`, `CLOUDFLARE_API_TOKEN`, `ELEVENLABS_AO_KEY`, `FIGMA_AO_KEY` |
