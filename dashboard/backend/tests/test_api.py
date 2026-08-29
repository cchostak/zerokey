import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "trust_domain" in data


@pytest.mark.asyncio
async def test_overview_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["trust_domain"] == "demo.local"
    assert "workload_entries_count" in data
    assert "spire_agent_count" in data


@pytest.mark.asyncio
async def test_entries_crud():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. List entries
        list_res = await ac.get("/api/entries")
        assert list_res.status_code == 200
        entries = list_res.json()
        assert isinstance(entries, list)

        # 2. Create entry with valid SPIFFE ID
        new_entry = {
            "spiffe_id": "spiffe://demo.local/custom-worker",
            "parent_id": "spiffe://demo.local/node/agent",
            "selectors": ["docker:label:workload:custom-worker"],
            "ttl": 1800,
            "admin": False,
            "dns_names": ["custom-worker"],
        }
        create_res = await ac.post("/api/entries", json=new_entry)
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["spiffe_id"] == "spiffe://demo.local/custom-worker"

        # 3. Create entry with invalid SPIFFE ID (should fail with 422)
        invalid_entry = {
            "spiffe_id": "invalid-prefix/worker",
            "parent_id": "spiffe://demo.local/node/agent",
            "selectors": ["docker:label:workload:invalid"],
        }
        invalid_res = await ac.post("/api/entries", json=invalid_entry)
        assert invalid_res.status_code == 422

        # 4. Delete entry
        del_res = await ac.delete(f"/api/entries/{created['entry_id']}")
        assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_agents_and_tokens():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. List agents
        agents_res = await ac.get("/api/agents")
        assert agents_res.status_code == 200
        agents = agents_res.json()
        assert len(agents) >= 1

        # 2. Generate join token
        token_req = {
            "spiffe_id": "spiffe://demo.local/node/agent-2",
            "ttl": 900,
        }
        token_res = await ac.post("/api/agents/token", json=token_req)
        assert token_res.status_code == 201
        token_data = token_res.json()
        assert "token" in token_data
        assert token_data["spiffe_id"] == "spiffe://demo.local/node/agent-2"
        assert "docker_command" in token_data


@pytest.mark.asyncio
async def test_bundles():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/bundles")
        assert res.status_code == 200
        bundle = res.json()
        assert bundle["trust_domain"] == "demo.local"
        assert bundle["x509_authorities_count"] >= 1


@pytest.mark.asyncio
async def test_oidc_discovery_and_keys():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Discovery doc
        disc_res = await ac.get("/api/oidc/discovery")
        assert disc_res.status_code == 200
        disc = disc_res.json()
        assert "jwks_uri" in disc
        assert "issuer" in disc

        # Keys
        keys_res = await ac.get("/api/oidc/keys")
        assert keys_res.status_code == 200
        keys_data = keys_res.json()
        assert "keys" in keys_data


@pytest.mark.asyncio
async def test_simulator_and_policy():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Successful keyless test flow
        sim_res = await ac.post("/api/simulator/execute", json={"simulate_unauthorized": False})
        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert sim_data["status"] == "success"
        assert len(sim_data["handshake_steps"]) >= 4

        # 2. Unauthorized test flow
        unauth_res = await ac.post("/api/simulator/execute", json={"simulate_unauthorized": True})
        assert unauth_res.status_code == 200
        unauth_data = unauth_res.json()
        assert unauth_data["status"] == "denied"
        assert unauth_data["status_code"] == 403

        # 3. Policy evaluation: allowed
        pol_res_allowed = await ac.post(
            "/api/simulator/evaluate-policy",
            json={
                "client_spiffe_id": "spiffe://demo.local/client-worker",
                "required_spiffe_id": "spiffe://demo.local/client-worker",
            },
        )
        assert pol_res_allowed.status_code == 200
        assert pol_res_allowed.json()["allowed"] is True

        # 4. Policy evaluation: denied
        pol_res_denied = await ac.post(
            "/api/simulator/evaluate-policy",
            json={
                "client_spiffe_id": "spiffe://demo.local/malicious-attacker",
                "required_spiffe_id": "spiffe://demo.local/client-worker",
            },
        )
        assert pol_res_denied.status_code == 200
        assert pol_res_denied.json()["allowed"] is False


@pytest.mark.asyncio
async def test_telemetry_and_audit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        logs_res = await ac.get("/api/telemetry/logs")
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert len(logs) >= 1

        metrics_res = await ac.get("/api/telemetry/metrics")
        assert metrics_res.status_code == 200
        metrics = metrics_res.json()
        assert "mtls_handshakes_success_rate" in metrics

        # 3. Prometheus plain-text metrics endpoint
        prom_res = await ac.get("/metrics")
        assert prom_res.status_code == 200
        assert b"spiffe_active_svids_total" in prom_res.content
        assert b"mtls_handshake_requests_total" in prom_res.content

