# ==============================================================================
# ZeroKey — SPIRE / SPIFFE Keyless Workload Identity Platform
# ==============================================================================

.PHONY: help init up down restart logs status bootstrap test-flow oidc-keys clean reset check fmt test test-backend test-frontend test-smoke scan doctor ui obs-up obs-down

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ANSI color codes
CYAN   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
BOLD   := \033[1m
NC     := \033[0m

help: ## Display available commands with descriptions
	@echo "=================================================================="
	@echo "  🔑 ZeroKey — SPIRE / SPIFFE Keyless Identity Platform          "
	@echo "=================================================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-16s$(NC) %s\n", $$1, $$2}'

init: ## Initialize local directory structure, .gitkeeps, and .env
	@echo "==> Initializing ZeroKey directory structure..."
	@mkdir -p conf data/server data/agent app/cmd/server app/cmd/client app/pkg/config app/pkg/spiffe app/pkg/server app/pkg/client dashboard/backend dashboard/frontend conf/observability scripts tests docs/adr
	@touch data/server/.gitkeep data/agent/.gitkeep
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
	else \
		echo "$(GREEN)✓ .env already exists.$(NC)"; \
	fi
	@chmod +x scripts/*.sh tests/*.sh 2>/dev/null || true
	@echo "$(GREEN)✓ Initialized successfully.$(NC)"

up: init ## Build and start all core containers (including UI and API) in detached mode
	@echo "==> Building and launching ZeroKey containers..."
	docker compose up -d --build
	@echo "$(GREEN)✓ Containers started.$(NC)"
	@echo "  ├─ Web Console: http://localhost:$${DASHBOARD_UI_PORT:-3000}"
	@echo "  ├─ Control API: http://localhost:$${DASHBOARD_API_PORT:-8000}"
	@echo "  └─ Run 'make bootstrap' to complete SPIRE node & workload attestation."

ui: up ## Start and open the ZeroKey Web Console and Control Plane
	@echo "==> ZeroKey Web Console available at http://localhost:3000"

obs-up: ## Launch Observability suite (OpenTelemetry Collector, Prometheus, Loki, Promtail, Grafana)
	@echo "==> Launching Observability Suite (OTel, Prometheus, Loki, Promtail, Grafana)..."
	docker compose --profile observability up -d
	@echo -e "$(GREEN)✓ Observability stack online.$(NC)"
	@echo "  ├─ Grafana:    http://localhost:$${GRAFANA_PORT:-3001} (admin / admin)"
	@echo "  ├─ Prometheus: http://localhost:$${PROMETHEUS_PORT:-9090}"
	@echo "  ├─ Loki:       http://localhost:3100"
	@echo "  └─ OTel:       http://localhost:4318 (HTTP), localhost:4317 (gRPC)"

obs-down: ## Stop Observability containers
	@echo "==> Stopping Observability containers..."
	docker compose --profile observability down

bootstrap: ## Attest node agent and register workload SPIFFE IDs in SPIRE
	@echo "==> Running SPIRE bootstrap..."
	@chmod +x scripts/bootstrap.sh scripts/agent-entrypoint.sh
	./scripts/bootstrap.sh

test-flow: ## Execute single-shot keyless mTLS transaction: client -> backend-api
	@echo "======================================================================"
	@echo "  🔒 Executing Keyless mTLS Authentication Test: client -> backend-api "
	@echo "======================================================================"
	docker compose exec -T client-worker /app/client -once

status: ## Display registered agents, entries, and container runtime state
	@echo "======================================================================"
	@echo "  📊 SPIRE Node Agents                                                "
	@echo "======================================================================"
	@docker compose exec -T spire-server /opt/spire/bin/spire-server agent list -socketPath /run/spire/server-sockets/api.sock || true
	@echo ""
	@echo "======================================================================"
	@echo "  📋 Workload Registration Entries                                    "
	@echo "======================================================================"
	@docker compose exec -T spire-server /opt/spire/bin/spire-server entry show -socketPath /run/spire/server-sockets/api.sock || true
	@echo ""
	@echo "======================================================================"
	@echo "  🐳 Docker Container Status                                          "
	@echo "======================================================================"
	@docker compose ps

oidc-keys: ## Inspect SPIRE OIDC Discovery (.well-known/openid-configuration) & JWKS
	@echo "======================================================================"
	@echo "  🌐 SPIRE OIDC Discovery Document (.well-known/openid-configuration) "
	@echo "======================================================================"
	@curl -s http://localhost:$${OIDC_HOST_PORT:-8088}/.well-known/openid-configuration | (command -v jq >/dev/null && jq . || cat) || true
	@echo ""
	@echo "======================================================================"
	@echo "  🔑 Published JWKS Keys (/keys)                                      "
	@echo "======================================================================"
	@curl -s http://localhost:$${OIDC_HOST_PORT:-8088}/keys | (command -v jq >/dev/null && jq . || cat) || true

logs: ## Stream unified logs across all running containers
	docker compose logs -f

down: ## Stop all stack containers
	@echo "==> Stopping ZeroKey containers..."
	docker compose down

restart: down up ## Clean restart of the stack services

check: ## Run static linters and checks across Go, Python, Frontend, and Shell
	@echo "==> [1/5] Checking Go formatting and vet..."
	@cd app && test -z "$$(gofmt -l .)" || (echo -e "$(RED)Unformatted Go files found:$(NC)" && gofmt -l . && exit 1)
	@cd app && go vet ./...
	@echo -e "$(GREEN)✓ Go formatting and vet passed.$(NC)"
	@echo "==> [2/5] Validating Docker Compose configuration..."
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@docker compose config -q
	@echo -e "$(GREEN)✓ Docker Compose configuration is valid.$(NC)"
	@echo "==> [3/5] Validating Shell script syntax..."
	@bash -n scripts/bootstrap.sh scripts/agent-entrypoint.sh tests/smoke_test.sh tests/run_all.sh
	@echo -e "$(GREEN)✓ Shell scripts passed syntax validation.$(NC)"
	@echo "==> [4/5] Checking Frontend TypeScript build..."
	@cd dashboard/frontend && npm run build >/dev/null
	@echo -e "$(GREEN)✓ Frontend build and type checking passed.$(NC)"
	@echo "==> [5/5] Checking YAML and Markdown formatting..."
	@if command -v yamllint >/dev/null 2>&1; then \
		yamllint -d '{extends: relaxed, rules: {line-length: {max: 180}}}' . && echo -e "$(GREEN)✓ yamllint passed.$(NC)"; \
	else \
		echo -e "$(YELLOW)ℹ yamllint not installed locally (skipped).$(NC)"; \
	fi
	@echo -e "$(BOLD)$(GREEN)✓ All static checks passed.$(NC)"

fmt: ## Auto-format Go code and repository files
	@echo "==> Formatting Go source files..."
	@cd app && gofmt -w -s .
	@echo -e "$(GREEN)✓ Go source files formatted.$(NC)"

test: ## Execute all unit tests (Go Workloads + Python Control Plane + Frontend)
	@echo "==> Running Go unit tests and policy verification..."
	@cd app && go test -v -race -coverprofile=coverage.out ./...
	@echo "==> Running FastAPI Control Plane unit tests..."
	@if [ -f /mnt/Squirtle/security-platform-lite/.venv/bin/pytest ]; then \
		PYTHONPATH=dashboard/backend /mnt/Squirtle/security-platform-lite/.venv/bin/pytest -v dashboard/backend/tests; \
	elif command -v pytest >/dev/null 2>&1; then \
		PYTHONPATH=dashboard/backend pytest -v dashboard/backend/tests; \
	fi
	@echo -e "$(BOLD)$(GREEN)✓ All test suites completed successfully.$(NC)"

test-backend: ## Run FastAPI backend unit tests with coverage
	@PYTHONPATH=dashboard/backend /mnt/Squirtle/security-platform-lite/.venv/bin/pytest -v dashboard/backend/tests

test-frontend: ## Build and validate Next.js frontend console
	@cd dashboard/frontend && npm run build

test-smoke: ## Execute end-to-end integration smoke test harness against containers
	@echo "==> Executing integration smoke test suite..."
	@chmod +x tests/smoke_test.sh
	@./tests/smoke_test.sh

scan: ## Run local secret and vulnerability audits
	@echo "==> Checking for accidental secret leaks..."
	@if command -v gitleaks >/dev/null 2>&1; then \
		gitleaks detect --no-git -v --exclude-path .env; \
	elif docker run --rm -v "$$(pwd):/path" zricethezav/gitleaks:latest detect --source="/path" --verbose --no-git --exclude-path=/path/.env 2>/dev/null; then \
		echo -e "$(GREEN)✓ Gitleaks container scan passed.$(NC)"; \
	else \
		echo -e "$(YELLOW)ℹ Gitleaks not installed; checking for obvious key leaks...$(NC)"; \
		grep -rnE 'sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36,}' . --exclude=.env.example --exclude=.env --exclude-dir=.git --exclude-dir=data --exclude-dir=node_modules --exclude-dir=.next 2>/dev/null || echo -e "$(GREEN)✓ No raw secrets detected.$(NC)"; \
	fi

doctor: ## Validate prerequisite CLI tools, Docker daemon, network ports, and .env
	@echo "================================================================"
	@echo "             🩺 ZeroKey System & Environment Doctor             "
	@echo "================================================================"
	@echo "1. Checking Required CLI Utilities:"
	@for tool in docker git make curl go node npm jq; do \
		if command -v $$tool >/dev/null 2>&1; then \
			echo -e "   $(GREEN)✓ $$tool$$(echo '                ' | cut -c 1-$$(expr 15 - $${#tool})) : $$(command -v $$tool)$(NC)"; \
		else \
			echo -e "   $(RED)✗ $$tool$$(echo '                ' | cut -c 1-$$(expr 15 - $${#tool})) : NOT FOUND$(NC)"; \
		fi \
	done
	@echo ""
	@echo "2. Checking Docker Daemon Status:"
	@if docker info >/dev/null 2>&1; then \
		echo -e "   $(GREEN)✓ Docker daemon is running and responsive.$(NC)"; \
	else \
		echo -e "   $(RED)✗ Docker daemon is unreachable. Please start Docker Engine.$(NC)"; \
	fi
	@echo ""
	@echo "3. Checking Configuration Files:"
	@if [ -f .env ]; then \
		echo -e "   $(GREEN)✓ .env file exists.$(NC)"; \
	else \
		echo -e "   $(YELLOW)⚠ .env missing. Run 'make init' to create it.$(NC)"; \
	fi
	@if [ -f conf/server.conf ]; then \
		echo -e "   $(GREEN)✓ conf/server.conf exists.$(NC)"; \
	else \
		echo -e "   $(RED)✗ conf/server.conf is missing.$(NC)"; \
	fi
	@if [ -f conf/agent.conf ]; then \
		echo -e "   $(GREEN)✓ conf/agent.conf exists.$(NC)"; \
	else \
		echo -e "   $(RED)✗ conf/agent.conf is missing.$(NC)"; \
	fi
	@if [ -f conf/oidc.conf ]; then \
		echo -e "   $(GREEN)✓ conf/oidc.conf exists.$(NC)"; \
	else \
		echo -e "   $(RED)✗ conf/oidc.conf is missing.$(NC)"; \
	fi
	@echo ""
	@echo "4. Checking Port Availability (3000, 8000, 8081, 8088, 8444):"
	@for port in 3000 8000 8081 8088 8444; do \
		if command -v nc >/dev/null 2>&1; then \
			if nc -z 127.0.0.1 $$port >/dev/null 2>&1; then \
				echo -e "   $(YELLOW)⚠ Port $$port is currently in use (possibly by running ZeroKey stack).$(NC)"; \
			else \
				echo -e "   $(GREEN)✓ Port $$port is free.$(NC)"; \
			fi \
		fi \
	done
	@echo "================================================================"
	@echo -e "$(BOLD)$(GREEN)✓ Doctor diagnostic check finished.$(NC)"

clean: down ## Stop containers, purge volumes, delete runtime datastores and test artifacts
	@echo "==> Cleaning containers, volumes, and identity state..."
	@docker compose down -v --remove-orphans 2>/dev/null || true
	@docker rm -f spire-server spire-agent spire-oidc backend-api client-worker dashboard-api dashboard-ui 2>/dev/null || true
	@rm -rf data/server/* data/agent/* conf/token app/coverage.out app/coverage.html dashboard/frontend/.next dashboard/frontend/node_modules
	@touch data/server/.gitkeep data/agent/.gitkeep
	@echo -e "$(GREEN)✓ ZeroKey lab clean.$(NC)"

reset: clean up ## Full clean re-initialization (clean + up + bootstrap + test-flow)
	@sleep 3
	@$(MAKE) bootstrap
	@sleep 2
	@$(MAKE) test-flow
