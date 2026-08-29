from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
)

# ---------------------------------------------------------------------------
# SVID & Identity Metrics
# ---------------------------------------------------------------------------
spiffe_active_svids_gauge = Gauge(
    "spiffe_active_svids_total",
    "Total number of active in-memory X.509 SVIDs",
    ["trust_domain"],
)

spiffe_registered_workloads_gauge = Gauge(
    "spiffe_registered_workloads_total",
    "Total registered SPIFFE workload entries in datastore",
    ["trust_domain"],
)

spiffe_attested_agents_gauge = Gauge(
    "spiffe_attested_agents_total",
    "Total attested SPIRE node agents",
    ["trust_domain"],
)

spiffe_svid_rotations_counter = Counter(
    "spiffe_svid_rotations_total",
    "Total SVID renewals and rotations performed",
    ["spiffe_id", "trust_domain"],
)

spiffe_svid_ttl_remaining_gauge = Gauge(
    "spiffe_svid_ttl_remaining_seconds",
    "Remaining TTL in seconds of the most recently issued X.509 SVID per workload",
    ["spiffe_id", "trust_domain"],
)

# ---------------------------------------------------------------------------
# mTLS Handshake & Traffic Metrics
# ---------------------------------------------------------------------------
mtls_handshake_requests_counter = Counter(
    "mtls_handshake_requests_total",
    "Total keyless mTLS transaction requests",
    ["client_spiffe_id", "server_spiffe_id", "status", "status_code"],
)

mtls_handshake_duration_histogram = Histogram(
    "mtls_handshake_duration_seconds",
    "Duration of keyless mTLS handshake and request execution",
    ["client_spiffe_id", "server_spiffe_id"],
    buckets=[0.0005, 0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)

# ---------------------------------------------------------------------------
# Policy & Audit Metrics
# ---------------------------------------------------------------------------
spiffe_policy_decisions_counter = Counter(
    "spiffe_policy_decisions_total",
    "Total SPIFFE ID authorization policy evaluations",
    ["decision", "client_spiffe_id", "required_spiffe_id"],
)

spiffe_audit_events_counter = Counter(
    "spiffe_audit_events_total",
    "Total audit log events emitted",
    ["event_type", "status"],
)

# ---------------------------------------------------------------------------
# Control Plane HTTP API Metrics
# ---------------------------------------------------------------------------
http_requests_counter = Counter(
    "zerokey_http_requests_total",
    "Total HTTP requests handled by the ZeroKey control-plane API",
    ["method", "path", "status_code"],
)

http_request_duration_histogram = Histogram(
    "zerokey_http_request_duration_seconds",
    "Latency of ZeroKey control-plane API requests",
    ["method", "path"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)

# ---------------------------------------------------------------------------
# OIDC Metrics
# ---------------------------------------------------------------------------
oidc_requests_counter = Counter(
    "oidc_requests_total",
    "Total OIDC discovery and JWKS requests",
    ["endpoint"],
)


def get_prometheus_metrics() -> bytes:
    """Generate Prometheus formatted metrics string."""
    return generate_latest()
