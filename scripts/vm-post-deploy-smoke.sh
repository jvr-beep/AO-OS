#!/usr/bin/env bash

set -euo pipefail

BUILD_IMAGE=0
if [[ "${1:-}" == "--build" ]]; then
  BUILD_IMAGE=1
fi

REPO_ROOT="${REPO_ROOT:-$HOME/AO-OS}"
API_BASE="${API_BASE:-http://localhost:4000}"
WEB_BASE="${WEB_BASE-http://localhost:3000}"

SEED_EMAIL="${SMOKE_ADMIN_EMAIL:-staff@ao-os.local}"
SEED_PASSWORD="${SMOKE_ADMIN_PASSWORD:-TestPassword123!}"
SEED_NAME="${SMOKE_ADMIN_NAME:-Seed Admin}"

ENV_FILE="$REPO_ROOT/apps/api/.env"
WEB_ENV_FILE="$REPO_ROOT/apps/web/.env"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.api.yml"

if [[ ! -d "$REPO_ROOT" ]]; then
  echo "ERROR: Repo root not found: $REPO_ROOT"
  exit 2
fi

# ── Env helpers ───────────────────────────────────────────────────────────────

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# Read a value from an env file (empty string if missing)
read_env() {
  local file="$1"
  local key="$2"
  grep -m1 "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2- || true
}

# Generate a 40-char random secret if not already set
ensure_secret() {
  local file="$1"
  local key="$2"
  local existing
  existing=$(read_env "$file" "$key")
  if [[ -z "$existing" || "$existing" == "replace-with"* ]]; then
    local secret
    secret=$(openssl rand -hex 20)
    upsert_env "$file" "$key" "$secret"
    echo "  Generated $key"
  fi
}

# ── Inject required env vars ──────────────────────────────────────────────────

echo "=== Configuring env vars ==="
touch "$ENV_FILE"
touch "$WEB_ENV_FILE"

# API .env
upsert_env "$ENV_FILE" "AUTH_SEED_ADMIN_EMAIL"    "$SEED_EMAIL"
upsert_env "$ENV_FILE" "AUTH_SEED_ADMIN_PASSWORD"  "$SEED_PASSWORD"
upsert_env "$ENV_FILE" "AUTH_SEED_ADMIN_NAME"      "$SEED_NAME"
ensure_secret "$ENV_FILE" "KIOSK_API_SECRET"

# Inject secrets from CI environment when present
if [[ -n "${RESEND_API_KEY:-}" ]]; then
  upsert_env "$ENV_FILE" "RESEND_API_KEY" "$RESEND_API_KEY"
  echo "  Injected RESEND_API_KEY"
fi

# Web .env
ensure_secret "$WEB_ENV_FILE" "SESSION_SECRET"
ensure_secret "$WEB_ENV_FILE" "MEMBER_SESSION_SECRET"
ensure_secret "$WEB_ENV_FILE" "KIOSK_SESSION_SECRET"

# Sync KIOSK_API_SECRET to web .env (must match API)
KIOSK_SECRET=$(read_env "$ENV_FILE" "KIOSK_API_SECRET")
upsert_env "$WEB_ENV_FILE" "KIOSK_API_SECRET" "$KIOSK_SECRET"

# Set API_BASE_URL in web .env if not present
if [[ -z "$(read_env "$WEB_ENV_FILE" "API_BASE_URL")" ]]; then
  upsert_env "$WEB_ENV_FILE" "API_BASE_URL" "http://ao-os-api:4000/v1"
fi

# Export build-time vars for docker-compose ARG interpolation
SESSION_SECRET_VAL=$(read_env "$WEB_ENV_FILE" "SESSION_SECRET")
STRIPE_PK=$(read_env "$WEB_ENV_FILE" "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
export SESSION_SECRET="${SESSION_SECRET_VAL:-}"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${STRIPE_PK:-}"

echo "=== Env configured ==="

# ── HTTP helpers ──────────────────────────────────────────────────────────────

http_code() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -d "$body" || true
  else
    curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" || true
  fi
}

check_result() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  local ok_values="$4"
  local result="FAIL"
  IFS=',' read -r -a values <<< "$ok_values"
  for code in "${values[@]}"; do
    if [[ "$actual" == "$code" ]]; then
      result="PASS"
      break
    fi
  done
  echo "$name|$expected|$actual|$result"
  if [[ "$result" == "FAIL" ]]; then
    FAILED=1
  fi
}

# ── Build API image ───────────────────────────────────────────────────────────

echo "=== Building API image ==="
docker rm -f ao-os-api 2>/dev/null || true

if [[ "$BUILD_IMAGE" -eq 1 ]]; then
  docker compose -f "$COMPOSE_FILE" build api
fi

# ── Run database migrations ───────────────────────────────────────────────────

echo "=== Running database migrations ==="
# Runs prisma migrate deploy in a temporary container using the freshly-built
# API image. The image contains the full repo at /app including prisma/migrations/.
docker compose -f "$COMPOSE_FILE" run --rm --no-deps \
  -e DATABASE_URL="$(read_env "$ENV_FILE" "DATABASE_URL")" \
  api sh -c "node_modules/.bin/prisma migrate deploy" \
  && echo "Migrations complete" \
  || echo "WARNING: Migration run failed — check DATABASE_URL and logs"

# ── Start API container ───────────────────────────────────────────────────────

echo "=== Starting API container ==="
docker compose -f "$COMPOSE_FILE" up -d --force-recreate --remove-orphans api

# ── Wait for API health ───────────────────────────────────────────────────────

echo "=== Waiting for API health ==="
for i in $(seq 1 60); do
  code=$(http_code GET "$API_BASE/v1/health")
  if [[ "$code" == "200" ]]; then
    echo "API healthy after $((i * 2))s"
    break
  fi
  sleep 2
done

# ── Build & start web ─────────────────────────────────────────────────────────

echo "=== Starting web container ==="
docker rm -f ao-os-web 2>/dev/null || true

if [[ "$BUILD_IMAGE" -eq 1 ]]; then
  docker compose -f "$COMPOSE_FILE" build web
fi
docker compose -f "$COMPOSE_FILE" up -d --force-recreate --remove-orphans web

# ── Smoke tests ───────────────────────────────────────────────────────────────

echo "=== Running smoke tests ==="
FAILED=0

api_health=$(http_code GET "$API_BASE/v1/health")

if [[ -n "${WEB_BASE:-}" ]]; then
  # Give web container a moment to start
  sleep 5
  web_login=$(http_code GET "$WEB_BASE/login")
else
  web_login="SKIP"
fi

login_body=$(printf '{"email":"%s","password":"%s"}' "$SEED_EMAIL" "$SEED_PASSWORD")
login_code=$(http_code POST "$API_BASE/v1/auth/login" "$login_body")
login_json=$(curl -s -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" -d "$login_body" || true)
token=$(printf "%s" "$login_json" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

if [[ -n "$token" ]]; then
  members_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/v1/members" \
    -H "Authorization: Bearer $token" || true)
  catalog_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/v1/catalog/tiers" \
    -H "Authorization: Bearer $token" || true)
  visits_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/v1/visits" \
    -H "Authorization: Bearer $token" || true)
else
  members_code="000"
  catalog_code="000"
  visits_code="000"
fi

members_noauth=$(http_code GET "$API_BASE/v1/members")

# Kiosk endpoint: POST /v1/kiosk/visit-payment with no secret → 401
kiosk_noauth=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$API_BASE/v1/kiosk/visit-payment" \
  -H "Content-Type: application/json" \
  -d '{}' || true)

echo "CHECK|EXPECTED|ACTUAL|RESULT"
check_result "API /v1/health"                      "200"     "$api_health"     "200"
check_result "POST /v1/auth/login (seed admin)"    "200/201" "$login_code"     "200,201"
check_result "GET /v1/members (Bearer)"            "200"     "$members_code"   "200"
check_result "GET /v1/catalog/tiers (Bearer)"      "200"     "$catalog_code"   "200"
check_result "GET /v1/visits (Bearer)"             "200"     "$visits_code"    "200"
check_result "GET /v1/members (no auth)"           "401/403" "$members_noauth" "401,403"
check_result "POST /v1/kiosk/* (no secret)"        "401"     "$kiosk_noauth"   "401"

if [[ "$web_login" == "SKIP" ]]; then
  echo "Web /login|SKIP|SKIP|SKIP (WEB_BASE not set)"
else
  check_result "Web /login" "200" "$web_login" "200"
fi

if [[ -n "$token" ]]; then
  echo "TOKEN_PREFIX=${token:0:20}"
fi

if [[ "$FAILED" -ne 0 ]]; then
  echo "=== Smoke FAILED ==="
  exit 1
fi

echo "=== Smoke PASSED ==="
