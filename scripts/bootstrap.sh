#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

SOCKET_ARG="-socketPath /run/spire/server-sockets/api.sock"

echo "=========================================================="
echo "      🚀 Bootstrapping SPIRE/SPIFFE Keyless Lab           "
echo "=========================================================="

echo "[1/4] Waiting for SPIRE Server to be healthy and ready..."
MAX_RETRIES=30
RETRY_COUNT=0
# shellcheck disable=SC2086  -- SOCKET_ARG is an intentional multi-word argument
until docker compose exec -T spire-server /opt/spire/bin/spire-server healthcheck ${SOCKET_ARG} > /dev/null 2>&1 \
      || [ "${RETRY_COUNT}" -eq "${MAX_RETRIES}" ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  - Waiting for SPIRE Server... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 1
done

if [ "${RETRY_COUNT}" -eq "${MAX_RETRIES}" ]; then
    echo "❌ SPIRE Server failed to become healthy in time."
    exit 1
fi
echo "  ✓ SPIRE Server is online."

echo "[2/4] Attesting SPIRE Agent Node..."
# shellcheck disable=SC2086
AGENT_LIST=$(docker compose exec -T spire-server /opt/spire/bin/spire-server agent list ${SOCKET_ARG} 2>/dev/null || true)
if echo "${AGENT_LIST}" | grep -q "spiffe://demo.local/node/agent"; then
    echo "  ✓ SPIRE Agent node already attested."
else
    echo "  - Generating node join token..."
    # shellcheck disable=SC2086
    TOKEN_OUT=$(docker compose exec -T spire-server /opt/spire/bin/spire-server token generate ${SOCKET_ARG} -spiffeID spiffe://demo.local/node/agent)
    TOKEN=$(echo "${TOKEN_OUT}" | awk '/Token:/ {print $2}' | tr -d '\r\n')
    echo "  ✓ Minted Join Token: ${TOKEN}"

    if grep -q "^JOIN_TOKEN=" "${ROOT_DIR}/.env"; then
        sed -i "s/^JOIN_TOKEN=.*/JOIN_TOKEN=${TOKEN}/" "${ROOT_DIR}/.env"
    else
        echo "JOIN_TOKEN=${TOKEN}" >> "${ROOT_DIR}/.env"
    fi

    echo "  - Launching SPIRE Agent with join token..."
    JOIN_TOKEN="${TOKEN}" docker compose up -d spire-agent

    echo "  - Waiting for SPIRE Agent to complete attestation..."
    AGENT_RETRIES=0
    # shellcheck disable=SC2086
    until docker compose exec -T spire-server /opt/spire/bin/spire-server agent list ${SOCKET_ARG} 2>/dev/null \
          | grep -q "spiffe://demo.local/node/agent" \
          || [ "${AGENT_RETRIES}" -eq 25 ]; do
        AGENT_RETRIES=$((AGENT_RETRIES + 1))
        sleep 1
    done
    echo "  ✓ SPIRE Agent attested successfully."
fi

echo "[3/4] Registering Workload Identities in SPIRE Datastore..."

# shellcheck disable=SC2086
EXISTING_ENTRIES=$(docker compose exec -T spire-server /opt/spire/bin/spire-server entry show ${SOCKET_ARG} 2>/dev/null || true)

# Register backend-api
if echo "${EXISTING_ENTRIES}" | grep -q "spiffe://demo.local/backend-api"; then
    echo "  ✓ Registration entry for backend-api already exists."
else
    echo "  - Registering backend-api (selector: docker:label:workload:backend-api)..."
    # shellcheck disable=SC2086
    docker compose exec -T spire-server /opt/spire/bin/spire-server entry create ${SOCKET_ARG} \
        -spiffeID spiffe://demo.local/backend-api \
        -parentID spiffe://demo.local/node/agent \
        -selector docker:label:workload:backend-api \
        -ttl 3600
    echo "  ✓ backend-api registered."
fi

# Register client-worker
if echo "${EXISTING_ENTRIES}" | grep -q "spiffe://demo.local/client-worker"; then
    echo "  ✓ Registration entry for client-worker already exists."
else
    echo "  - Registering client-worker (selector: docker:label:workload:client-worker)..."
    # shellcheck disable=SC2086
    docker compose exec -T spire-server /opt/spire/bin/spire-server entry create ${SOCKET_ARG} \
        -spiffeID spiffe://demo.local/client-worker \
        -parentID spiffe://demo.local/node/agent \
        -selector docker:label:workload:client-worker \
        -ttl 3600
    echo "  ✓ client-worker registered."
fi

# Ensure running workloads reload their freshly registered SVIDs
echo "  - Synchronizing workload containers with Workload API..."
docker compose restart backend-api client-worker > /dev/null 2>&1 || true
sleep 1

echo "[4/4] Current SPIRE State Overview:"
echo ""
echo "--- Registered SPIRE Agents ---"
# shellcheck disable=SC2086
docker compose exec -T spire-server /opt/spire/bin/spire-server agent list ${SOCKET_ARG} || true
echo ""
echo "--- Workload Registration Entries ---"
# shellcheck disable=SC2086
docker compose exec -T spire-server /opt/spire/bin/spire-server entry show ${SOCKET_ARG} || true
echo ""
echo "=========================================================="
echo "  ✅ SPIRE Keyless Bootstrap Complete!                    "
echo "  Run 'make test-flow' to trigger an mTLS keyless request."
echo "=========================================================="
