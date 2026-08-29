export interface OverviewSummary {
  trust_domain: string;
  spire_server_healthy: boolean;
  spire_agent_count: number;
  workload_entries_count: number;
  oidc_healthy: boolean;
  backend_api_healthy: boolean;
  active_svids: number;
  system_version: string;
}

export interface WorkloadEntry {
  id: string;
  spiffe_id: string;
  parent_id: string;
  selectors: string[];
  ttl: number;
  admin: boolean;
  dns_names: string[];
  created_at?: string;
  expires_at?: string;
}

export interface CreateEntryPayload {
  spiffe_id: string;
  parent_id: string;
  selectors: string[];
  ttl?: number;
  admin?: boolean;
  dns_names?: string[];
}

export interface NodeAgent {
  spiffe_id: string;
  attested_at?: string;
  expires_at?: string;
  serial_number?: string;
  status: string;
  selectors: string[];
}

export interface GenerateTokenPayload {
  spiffe_id: string;
  ttl?: number;
}

export interface GenerateTokenResponse {
  token: string;
  spiffe_id: string;
  ttl: number;
  docker_command: string;
}

export interface TrustBundle {
  trust_domain: string;
  x509_authorities_count: number;
  x509_authorities_pem: string[];
  jwt_authorities_count: number;
}

export interface OIDCDiscoveryDoc {
  issuer: string;
  jwks_uri: string;
  authorization_endpoint?: string;
  response_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
}

export interface JWKSResponse {
  keys: Array<{
    kty: string;
    kid: string;
    use: string;
    alg: string;
    n?: string;
    e?: string;
    [key: string]: any;
  }>;
}

export interface HandshakeStep {
  step_number: number;
  title: string;
  actor: string;
  status: string;
  details: string;
  timestamp: string;
}

export interface KeylessTestFlowResponse {
  status: string;
  message: string;
  client_spiffe_id: string;
  server_spiffe_id: string;
  latency_ms: number;
  status_code: number;
  timestamp: string;
  payload: Record<string, any>;
  handshake_steps: HandshakeStep[];
}

export interface PolicyEvaluationResponse {
  allowed: boolean;
  decision_reason: string;
  client_spiffe_id: string;
  required_spiffe_id: string;
  timestamp: string;
}

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  event_type: string;
  actor: string;
  target: string;
  status: string;
  details: string;
}

export interface IdentityMetrics {
  svid_rotations_total: number;
  active_trust_domains: number;
  mtls_handshakes_success_rate: number;
  average_handshake_latency_ms: number;
  attestation_rate_per_min: number;
  recent_policy_denials: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return res.json();
  } catch (error: any) {
    console.warn(`[API] Error querying ${url}:`, error.message);
    throw error;
  }
}

export const api = {
  getOverview: () => fetchJSON<OverviewSummary>("/api/overview"),
  getEntries: () => fetchJSON<WorkloadEntry[]>("/api/entries"),
  createEntry: (payload: CreateEntryPayload) =>
    fetchJSON<{ status: string; entry_id: string; spiffe_id: string; message: string }>("/api/entries", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteEntry: (entryId: string) =>
    fetchJSON<{ status: string; message: string }>(`/api/entries/${entryId}`, {
      method: "DELETE",
    }),
  getAgents: () => fetchJSON<NodeAgent[]>("/api/agents"),
  generateToken: (payload: GenerateTokenPayload) =>
    fetchJSON<GenerateTokenResponse>("/api/agents/token", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getTrustBundle: () => fetchJSON<TrustBundle>("/api/bundles"),
  getOIDCDiscovery: () => fetchJSON<OIDCDiscoveryDoc>("/api/oidc/discovery"),
  getJWKS: () => fetchJSON<JWKSResponse>("/api/oidc/keys"),
  executeTestFlow: (simulateUnauthorized = false) =>
    fetchJSON<KeylessTestFlowResponse>("/api/simulator/execute", {
      method: "POST",
      body: JSON.stringify({ simulate_unauthorized: simulateUnauthorized }),
    }),
  evaluatePolicy: (clientSpiffeId: string, requiredSpiffeId = "spiffe://demo.local/client-worker") =>
    fetchJSON<PolicyEvaluationResponse>("/api/simulator/evaluate-policy", {
      method: "POST",
      body: JSON.stringify({
        client_spiffe_id: clientSpiffeId,
        required_spiffe_id: requiredSpiffeId,
      }),
    }),
  getAuditLogs: (limit = 50) => fetchJSON<AuditLogEvent[]>(`/api/telemetry/logs?limit=${limit}`),
  getMetrics: () => fetchJSON<IdentityMetrics>("/api/telemetry/metrics"),
};
