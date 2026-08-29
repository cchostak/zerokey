#!/usr/bin/env bash
# ==============================================================================
# Master Test Runner — Executes Go Unit Tests & Integration Smoke Tests
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "=================================================================="
echo "  🚀 Running ZeroKey Complete Test Suite                          "
echo "=================================================================="

echo -e "\n==> [1/2] Executing Go Unit Tests..."
cd "${ROOT_DIR}/app"
go test -v -race -coverprofile=coverage.out ./...
go tool cover -func=coverage.out 2>/dev/null | tail -n 1 || true
cd "${ROOT_DIR}"

echo -e "\n==> [2/2] Executing Integration Smoke Tests..."
chmod +x tests/smoke_test.sh
./tests/smoke_test.sh

echo "=================================================================="
echo "  ✅ All Unit and Integration Tests Passed!                       "
echo "=================================================================="
