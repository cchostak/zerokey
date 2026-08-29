#!/bin/sh
set -e

echo "=== [SPIRE Agent Entrypoint] Initializing ==="

mkdir -p /run/spire/sockets
mkdir -p /opt/spire/data/agent

# If agent already has an identity datastore, start directly
if [ -f /opt/spire/data/agent/agent_svid.der ] || [ -f /opt/spire/data/agent/bundle.der ]; then
    echo "[SPIRE Agent] Existing attested state found. Starting agent..."
    exec /opt/spire/bin/spire-agent run -config /opt/spire/conf/agent/agent.conf
fi

# Check for join token from environment or token file
TOKEN="${JOIN_TOKEN:-}"

if [ -f /opt/spire/conf/agent/token ]; then
    TOKEN="$(cat /opt/spire/conf/agent/token)"
fi

if [ -n "$TOKEN" ]; then
    echo "[SPIRE Agent] Starting agent with join token..."
    exec /opt/spire/bin/spire-agent run -config /opt/spire/conf/agent/agent.conf -joinToken "$TOKEN"
fi

echo "[SPIRE Agent] Waiting for join token from bootstrap script (via /opt/spire/conf/agent/token)..."
while [ ! -f /opt/spire/conf/agent/token ]; do
    sleep 1
done

TOKEN="$(cat /opt/spire/conf/agent/token)"
echo "[SPIRE Agent] Received join token. Attesting and starting agent daemon..."
exec /opt/spire/bin/spire-agent run -config /opt/spire/conf/agent/agent.conf -joinToken "$TOKEN"
