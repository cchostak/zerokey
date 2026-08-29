#!/usr/bin/env bash
# ==============================================================================
# ZeroKey SPIRE / SPIFFE Keyless Identity Lab - Integration Smoke Test Suite
# ==============================================================================
# Usage:
#   ./tests/smoke_test.sh [OPTIONS]
#
# Options:
#   --up                  Launch docker compose stack and bootstrap before testing
#   --down                Tear down docker compose stack after testing
#   --timeout <seconds>   Maximum wait time per service (default: 30)
#   --oidc-url <url>      SPIRE OIDC Discovery base URL (default: http://localhost:8088)
#   --backend-port <port> Exposed backend API host port (default: 8444)
#   --api-url <url>       ZeroKey Control Plane API base URL (default: http://localhost:8000)
#   --ui-url <url>        ZeroKey Web Console base URL (default: http://localhost:3000)
#   --help, -h            Show this help message
# ==============================================================================

set -euo pipefail

# ANSI color escape sequences
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default parameters
BRING_UP=false
TEAR_DOWN=false
TIMEOUT_SECS=30
OIDC_URL="http://localhost:8088"
BACKEND_PORT="8444"
API_URL="http://localhost:8000"
UI_URL="http://localhost:3000"
SOCKET_ARG="-socketPath /run/spire/server-sockets/api.sock"

# Counter metrics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Print formatted headers and log messages
log_info()    { echo -e "${BLUE}ℹ [INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}✓ [PASS]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}⚠ [WARN]${NC} $*"; }
log_fail()    { echo -e "${RED}✗ [FAIL]${NC} $*"; }
log_step()    { echo -e "\n${BOLD}${CYAN}==>${NC} ${BOLD}$*${NC}"; }

show_help() {
  cat << 'EOF'
ZeroKey Integration Smoke Test Runner

Usage: ./tests/smoke_test.sh [OPTIONS]

Options:
  --up                  Bring up the docker compose stack and bootstrap identities
  --down                Tear down the docker compose stack upon test completion
  --timeout <seconds>   Max seconds to wait for service readiness (default: 30)
  --oidc-url <url>      SPIRE OIDC endpoint (default: http://localhost:8088)
  --backend-port <port> Backend API port (default: 8444)
  --api-url <url>       ZeroKey Control Plane API (default: http://localhost:8000)
  --ui-url <url>        ZeroKey Web Console (default: http://localhost:3000)
  --help, -h            Show this help dialog
EOF
  exit 0
}

# Parse CLI arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --up)
      BRING_UP=true
      shift
      ;;
    --down)
      TEAR_DOWN=true
      shift
      ;;
    --timeout)
      TIMEOUT_SECS="$2"
      shift 2
      ;;
    --oidc-url)
      OIDC_URL="$2"
      shift 2
      ;;
    --backend-port)
      BACKEND_PORT="$2"
      shift 2
      ;;
    --api-url)
      API_URL="$2"
      shift 2
      ;;
    --ui-url)
      UI_URL="$2"
      shift 2
      ;;
    --help|-h)
      show_help
      ;;
    *)
      log_fail "Unknown argument: $1"
      show_help
      ;;
  esac
done

cleanup() {
  if [ "$TEAR_DOWN" = true ]; then
    log_step "Tearing down Docker Compose test environment..."
    docker compose down -v || true
  fi
}
trap cleanup EXIT

# Helper to poll HTTP endpoint until 200 or timeout
wait_for_http_endpoint() {
  local url="$1"
  local description="$2"
  local timeout="${3:-$TIMEOUT_SECS}"
  local start_time
  start_time=$(date +%s)

  log_info "Waiting for ${description} at ${url} (timeout: ${timeout}s)..."

  while true; do
    local current_time
    current_time=$(date +%s)
    local elapsed=$((current_time - start_time))

    if [ "$elapsed" -ge "$timeout" ]; then
      log_fail "Timed out waiting for ${description} at ${url} after ${elapsed}s"
      return 1
    fi

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
      log_success "${description} is ready (HTTP ${http_code}) after ${elapsed}s"
      return 0
    fi

    sleep 1
  done
}

assert_status() {
  local test_name="$1"
  local expected_code="$2"
  local actual_code="$3"
  local response_body="$4"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if [ "$actual_code" -eq "$expected_code" ]; then
    log_success "${test_name} (HTTP ${actual_code})"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    log_fail "${test_name}: Expected HTTP ${expected_code}, got ${actual_code}"
    echo "  Response body: ${response_body}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

assert_json_contains() {
  local test_name="$1"
  local substring="$2"
  local response_body="$3"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if echo "$response_body" | grep -q "$substring"; then
    log_success "${test_name} (Contains '${substring}')"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    log_fail "${test_name}: Expected substring '${substring}' in response"
    echo "  Actual body: ${response_body}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

assert_command_success() {
  local test_name="$1"
  shift
  local cmd="$*"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if output=$(eval "$cmd" 2>&1); then
    log_success "${test_name}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    log_fail "${test_name}: Command exited with error"
    echo "  Output: ${output}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# ------------------------------------------------------------------------------
# Test Execution
# ------------------------------------------------------------------------------

echo "=================================================================="
echo "  🧪 ZeroKey SPIRE / SPIFFE Keyless Identity Smoke Test Harness   "
echo "=================================================================="

# Step 0: Optionally launch stack and bootstrap
if [ "$BRING_UP" = true ]; then
  log_step "Launching Docker Compose stack & bootstrapping SPIRE..."
  if [ ! -f .env ]; then
    cp .env.example .env
  fi
  docker compose up -d --build
  chmod +x scripts/*.sh
  ./scripts/bootstrap.sh
fi

# Step 1: SPIRE Server Health & Socket Attestation
log_step "Verifying SPIRE Server Health & Sockets..."

assert_command_success "SPIRE Server Healthcheck" \
  "docker compose exec -T spire-server /opt/spire/bin/spire-server healthcheck ${SOCKET_ARG}"

# Step 2: SPIRE OIDC Discovery & JWKS Verification
log_step "Verifying SPIRE OIDC Discovery Provider..."

wait_for_http_endpoint "${OIDC_URL}/.well-known/openid-configuration" "SPIRE OIDC Discovery" "$TIMEOUT_SECS"

# 2.1 OIDC Discovery Doc
OIDC_RESP=$(curl -s -w "\n%{http_code}" "${OIDC_URL}/.well-known/openid-configuration")
OIDC_BODY=$(echo "$OIDC_RESP" | sed '$d')
OIDC_CODE=$(echo "$OIDC_RESP" | tail -n1)
assert_status "OIDC Discovery GET returns 200" 200 "$OIDC_CODE" "$OIDC_BODY"
assert_json_contains "OIDC Discovery issuer field" '"issuer"' "$OIDC_BODY"
assert_json_contains "OIDC Discovery jwks_uri field" '"jwks_uri"' "$OIDC_BODY"

# 2.2 Published JWKS Keys
JWKS_RESP=$(curl -s -w "\n%{http_code}" "${OIDC_URL}/keys")
JWKS_BODY=$(echo "$JWKS_RESP" | sed '$d')
JWKS_CODE=$(echo "$JWKS_RESP" | tail -n1)
assert_status "JWKS GET returns 200" 200 "$JWKS_CODE" "$JWKS_BODY"
assert_json_contains "JWKS keys array" '"keys"' "$JWKS_BODY"

# Step 3: SPIRE Node Agent Attestation & Workload Registration
log_step "Verifying SPIRE Agent Node & Workload Registration Entries..."

# 3.1 Node Agent List
AGENT_OUTPUT=$(docker compose exec -T spire-server /opt/spire/bin/spire-server agent list ${SOCKET_ARG} 2>&1 || true)
assert_json_contains "SPIRE Agent node registered" "Attestation type  : join_token" "$AGENT_OUTPUT"

# 3.2 Workload Entries
ENTRY_OUTPUT=$(docker compose exec -T spire-server /opt/spire/bin/spire-server entry show ${SOCKET_ARG} 2>&1 || true)
assert_json_contains "Registration entry for backend-api exists" "spiffe://demo.local/backend-api" "$ENTRY_OUTPUT"
assert_json_contains "Registration entry for client-worker exists" "spiffe://demo.local/client-worker" "$ENTRY_OUTPUT"

# Step 4: Container Process Status
log_step "Verifying Workload & Control Plane Containers Status..."

CONTAINERS_RUNNING=$(docker compose ps --services --filter "status=running")
assert_json_contains "spire-server container is running" "spire-server" "$CONTAINERS_RUNNING"
assert_json_contains "spire-agent container is running" "spire-agent" "$CONTAINERS_RUNNING"
assert_json_contains "spire-oidc container is running" "spire-oidc" "$CONTAINERS_RUNNING"
assert_json_contains "backend-api container is running" "backend-api" "$CONTAINERS_RUNNING"
assert_json_contains "client-worker container is running" "client-worker" "$CONTAINERS_RUNNING"

# Step 5: End-to-End Keyless mTLS Authentication Flow
log_step "Testing End-to-End Keyless mTLS Authentication (client -> backend-api)..."

CLIENT_EXEC_OUTPUT=$(docker compose exec -T client-worker /app/client -once 2>&1 || true)
assert_json_contains "Client worker acquired SVID" "Client SVID acquired successfully" "$CLIENT_EXEC_OUTPUT"
assert_json_contains "Client SPIFFE ID verified" "spiffe://demo.local/client-worker" "$CLIENT_EXEC_OUTPUT"
assert_json_contains "Response 200 OK received" "RESPONSE 200 OK" "$CLIENT_EXEC_OUTPUT"
assert_json_contains "Secret vault token received in payload" "dynamic-keyless-token-xyz-7890" "$CLIENT_EXEC_OUTPUT"
assert_json_contains "Authenticated client SPIFFE ID in payload" '"authenticated_client_spiffe_id": "spiffe://demo.local/client-worker"' "$CLIENT_EXEC_OUTPUT"

# Step 6: Negative Security Verification (Untrusted Non-mTLS Connection Blocked)
log_step "Verifying Negative Security Boundary (Direct Non-mTLS Handshake Failure)..."

UNTRUSTED_CURL=$(curl -k -s -w "\n%{http_code}" "https://localhost:${BACKEND_PORT}/api/secret-data" 2>&1 || echo "HANDSHAKE_FAILED")
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if echo "$UNTRUSTED_CURL" | grep -qiE "certificate required|alert|handshake_failure|curl: \(35\)|HANDSHAKE_FAILED|000"; then
  log_success "Untrusted non-mTLS client blocked by backend-api TLS authorizer"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  log_fail "Untrusted client unexpectedly bypassed TLS authorization!"
  echo "  Output: ${UNTRUSTED_CURL}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Step 7: ZeroKey Control Plane API Verification
if [ -n "${API_URL:-}" ]; then
  log_step "Verifying ZeroKey Control Plane API (${API_URL})..."
  if curl -s "${API_URL}/health" >/dev/null 2>&1; then
    API_HEALTH=$(curl -s "${API_URL}/health")
    assert_json_contains "Control Plane API health endpoint" '"healthy"' "$API_HEALTH"

    API_OVERVIEW=$(curl -s "${API_URL}/api/overview")
    assert_json_contains "Control Plane API overview trust domain" '"demo.local"' "$API_OVERVIEW"

    API_ENTRIES=$(curl -s "${API_URL}/api/entries")
    assert_json_contains "Control Plane API entries list" 'spiffe://demo.local' "$API_ENTRIES"
  else
    log_warn "Control Plane API not reachable at ${API_URL} (Skipping API smoke step)"
  fi
fi

# Step 8: ZeroKey Web Console Verification
if [ -n "${UI_URL:-}" ]; then
  log_step "Verifying ZeroKey Management Web Console (${UI_URL})..."
  if curl -s "${UI_URL}" >/dev/null 2>&1; then
    UI_RESP=$(curl -s "${UI_URL}")
    assert_json_contains "Web Console HTML served" "ZeroKey" "$UI_RESP"
  else
    log_warn "Web Console not reachable at ${UI_URL} (Skipping UI smoke step)"
  fi
fi

# ------------------------------------------------------------------------------
# Test Summary
# ------------------------------------------------------------------------------
echo ""
echo "=================================================================="
echo "                   Smoke Test Suite Summary                       "
echo "=================================================================="
echo -e " Total Assertions : ${BOLD}${TOTAL_TESTS}${NC}"
echo -e " Passed           : ${GREEN}${BOLD}${PASSED_TESTS}${NC}"
echo -e " Failed           : ${RED}${BOLD}${FAILED_TESTS}${NC}"
echo "=================================================================="

if [ "$FAILED_TESTS" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ ALL INTEGRATION SMOKE TESTS PASSED SUCCESSFULLY!${NC}\n"
  exit 0
else
  echo -e "${RED}${BOLD}✗ SOME TESTS FAILED. See details above.${NC}\n"
  exit 1
fi
