#!/usr/bin/env bash

set -euo pipefail

BUILD_IMAGE=0
if [[ "${1:-}" == "--build" ]]; then
  BUILD_IMAGE=1
fi

REPO_ROOT="${REPO_ROOT:-$HOME/AO-OS}"
API_BASE="${API_BASE:-http://localhost:4000}"
WEB_BASE="${WEB_BASE:-http://localhost:3000}"

SEED_EMAIL="${SMOKE_ADMIN_EMAIL:-staff@ao-os.local}"
SEED_PASSWORD="${SMOKE_ADMIN_PASSWORD:-TestPassword123!}"
SEED_NAME="${SMOKE_ADMIN_NAME:-Seed Admin}"

ENV_FILE="$REPO_ROOT/apps/api/.env"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.api.yml"

if [[ ! -d "$REPO_ROOT" ]]; then
  echo "ERROR: Repo root not found: $REPO_ROOT"
  exit 2
fi

upsert_env() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

http_code() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$body" || true
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

echo "=== AO OS VM Post-Deploy Smoke ==="
echo "Repo: $REPO_ROOT"
echo "API:  $API_BASE"
echo "Web:  $WEB_BASE"

touch "$ENV_FILE"
upsert_env "AUTH_SEED_ADMIN_EMAIL" "$SEED_EMAIL"
upsert_env "AUTH_SEED_ADMIN_PASSWORD" "$SEED_PASSWORD"
upsert_env "AUTH_SEED_ADMIN_NAME" "$SEED_NAME"

echo "=== Seed env configured ==="
grep -E "^AUTH_SEED_ADMIN_(EMAIL|NAME)=" "$ENV_FILE" || true

echo "=== Starting API container ==="
# Remove any stale stopped containers whose name matches so compose can reuse the name cleanly
docker rm -f ao-os-api 2>/dev/null || true

if [[ "$BUILD_IMAGE" -eq 1 ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --build --force-recreate --remove-orphans api
else
  docker compose -f "$COMPOSE_FILE" up -d --force-recreate --remove-orphans api
fi

echo "=== Waiting for API health ==="
for i in $(seq 1 30); do
  code=$(http_code GET "$API_BASE/v1/health")
  if [[ "$code" == "200" ]]; then
    break
  fi
  sleep 2
done

FAILED=0

api_health=$(http_code GET "$API_BASE/v1/health")
web_login=$(http_code GET "$WEB_BASE/login")

login_body=$(printf '{"email":"%s","password":"%s"}' "$SEED_EMAIL" "$SEED_PASSWORD")
login_code=$(http_code POST "$API_BASE/v1/auth/login" "$login_body")
login_json=$(curl -s -X POST "$API_BASE/v1/auth/login" -H "Content-Type: application/json" -d "$login_body" || true)
token=$(printf "%s" "$login_json" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

if [[ -n "$token" ]]; then
  members_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/v1/members" -H "Authorization: Bearer $token" || true)
else
  members_code="000"
fi

ts=$(date +%s)
signup_email="smoke-${ts}@test.local"
signup_body=$(printf '{"email":"%s","password":"%s"}' "$signup_email" "SecurePass123!")
signup_code=$(http_code POST "$API_BASE/v1/auth/signup" "$signup_body")

reset_body=$(printf '{"email":"%s"}' "$signup_email")
reset_code=$(http_code POST "$API_BASE/v1/auth/password-reset/request" "$reset_body")

members_noauth=$(http_code GET "$API_BASE/v1/members")

echo "CHECK|EXPECTED|ACTUAL|RESULT"
check_result "API /v1/health" "200" "$api_health" "200"
check_result "Web /login" "200" "$web_login" "200"
check_result "POST /v1/auth/login (seed admin)" "200/201" "$login_code" "200,201"
check_result "GET /v1/members (Bearer)" "200" "$members_code" "200"
check_result "POST /v1/auth/signup" "200/201" "$signup_code" "200,201"
check_result "POST /v1/auth/password-reset/request" "200/201" "$reset_code" "200,201"
check_result "GET /v1/members (no auth)" "401/403" "$members_noauth" "401,403"

if [[ -n "$token" ]]; then
  echo "TOKEN_PREFIX=${token:0:20}"
fi

if [[ "$FAILED" -ne 0 ]]; then
  echo "=== Smoke failed ==="
  exit 1
fi

echo "=== Smoke passed ==="