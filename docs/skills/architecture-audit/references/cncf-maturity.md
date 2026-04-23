# CNCF Cloud Native Maturity — audit reference

CNCF's maturity model tracks how far a system has progressed in adopting cloud-native patterns. Five levels. Identify the current level for each dimension, then note what it would take to reach the next level.

## Dimensions

Walk each of these. Score 1–5 per dimension.

### 1. Build & Deploy
- **L1 (Build):** Manual builds. Maybe a basic CI step.
- **L2 (Operate):** Containerized. Dockerfile in repo. Push to registry.
- **L3 (Scale):** Automated CI/CD pipeline. Branch protection. Staged rollouts.
- **L4 (Improve):** Progressive delivery (canary, blue-green). Feature flags. Automated rollback on SLO breach.
- **L5 (Optimize):** Deployment policy as code. Policy enforcement at admission. Zero-touch deploys.

### 2. Application definition & development
- **L1:** Code lives in a repo. Some structure.
- **L2:** Clear service boundaries. Packaged as images.
- **L3:** Helm / Kustomize manifests. Config separated from code.
- **L4:** GitOps — manifests in git are the source of truth for cluster state.
- **L5:** Service catalog. Internal developer platform abstracts deployment mechanics.

### 3. Observability
- **L1:** Basic logs in stdout. No aggregation.
- **L2:** Logs aggregated somewhere searchable.
- **L3:** Metrics + logs. Dashboards for key services.
- **L4:** Distributed tracing. SLOs / error budgets defined and tracked.
- **L5:** Auto-correlation across logs / metrics / traces. Anomaly detection. AIOps.

### 4. Service mesh / networking
- **L1:** Direct point-to-point calls. Hardcoded URLs.
- **L2:** DNS-based service discovery. Load balancing at ingress.
- **L3:** mTLS between services. Ingress gateway with TLS termination.
- **L4:** Service mesh (Istio / Linkerd) — mTLS by default, traffic shifting, observability built in.
- **L5:** Zero-trust networking. Policy-driven traffic control. Identity-aware proxying.

### 5. Data
- **L1:** Single DB. Manual backups.
- **L2:** Backups automated. Migrations version-controlled.
- **L3:** Read replicas. Point-in-time recovery. Schema change CI gates.
- **L4:** Polyglot persistence (right DB per workload). Data pipelines defined declaratively.
- **L5:** Data mesh — domain ownership, discoverable data products, schemas contracted.

### 6. Security
- **L1:** Best-effort. Some secrets in env vars, some hardcoded.
- **L2:** Central secret manager. TLS externally.
- **L3:** mTLS internally. Vulnerability scanning in CI. Dependency updates automated (Dependabot).
- **L4:** Runtime security (falco / gvisor). Policy as code (OPA / Kyverno).
- **L5:** Zero-trust architecture. Supply-chain attestations (SLSA). Signed images.

### 7. Infrastructure (platform)
- **L1:** VMs. Manually provisioned.
- **L2:** Managed containers (Cloud Run, ECS, App Engine).
- **L3:** Kubernetes (GKE, EKS, AKS). Basic addons (cert-manager, ingress-nginx).
- **L4:** Multi-cluster. GitOps for infra. IaC enforced.
- **L5:** Self-service platform. Abstracted infra primitives. Team self-onboarding.

## Auditing pattern

For each dimension:
1. State the current level with one-line evidence.
2. State the next level and the gap.
3. Not every system should be at L5 everywhere — note when a lower level is appropriate (e.g., a 10-person company doesn't need a service mesh at L4).

## Aggregate score

Average across dimensions. Typical levels:
- **Early-stage startup:** 1.5–2.5 across most dimensions is normal.
- **Growth-stage:** 2.5–3.5.
- **Mature cloud-native org:** 3.5–4.5.
- Anyone at L5 across every dimension is either a platform company (that's their product) or lying on the questionnaire.

The interesting output is the **gap per dimension**, not the aggregate number. Focus remediation on the dimensions furthest from where they need to be given the system's phase.
