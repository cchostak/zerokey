# Security Policy — ZeroKey Platform

## 1. Scope & Commitment
ZeroKey provides reference architecture and tooling for cryptographically verifiable, keyless workload authentication using **SPIRE** and **SPIFFE** standards. We treat security vulnerabilities with the highest priority and commit to rapid remediation and coordinated disclosure.

---

## 2. Threat Model & Trust Boundaries

The platform operates under the following security model:
1. **Workload API Isolation**: Workload attestation relies on kernel process boundary isolation and local Unix Domain Sockets (`/run/spire/sockets/agent.sock`). Containers only receive SVIDs matching their verified selectors.
2. **Zero Static Credentials**: Services never store private keys, root certificates, passwords, or static tokens on persistent disks or container layers.
3. **Mutual Identity Verification**: Every network transaction validates both the client and server SPIFFE IDs against designated trust domain policies. Handshakes from unauthorized identities or mismatched trust domains are terminated immediately.
4. **Short-Lived SVIDs**: X.509 certificates have short lifetimes (default 1 hour) and are automatically refreshed in memory by the `go-spiffe/v2` SDK.

---

## 3. Supported Versions

Security updates and patches are actively maintained for the following versions:

| Version | Supported | Notes |
| :--- | :--- | :--- |
| `1.x.x` (main) | ✅ Yes | Current enterprise release branch |
| `< 1.0.0` | ❌ No | Scaffold / development iterations |

---

## 4. Reporting a Vulnerability

If you discover a security vulnerability or suspect a potential security flaw in ZeroKey:

1. **Do NOT file a public issue.**
2. Send a detailed report via encrypted email to:
   - **Email:** `security@platform.local` (or create a private GitHub Security Advisory).
3. Include the following details to assist rapid triage:
   - Description of the vulnerability and its potential impact.
   - Exact steps to reproduce or Proof-of-Concept (PoC) code/scripts.
   - Affected components (`spire-server`, `spire-agent`, `spire-oidc`, `backend-api`, `client-worker`, etc.).
   - Proposed remediations (if known).

---

## 5. Vulnerability Response SLA

Our security response team adheres to the following response timeline:
- **Initial Acknowledgment:** Within **24 hours**.
- **Triage & Severity Assessment:** Within **48 hours**.
- **Fix & Advisory Publication:** Within **14 business days** (or sooner for Critical/High severity CVEs).

---

## 6. Security Best Practices for Operators

When deploying ZeroKey or SPIRE in production:
- Mount `/var/run/docker.sock` to the SPIRE Agent with read-only permissions (`:ro`).
- Do not expose the SPIRE Server datastore (`sqlite3` / `postgres`) to untrusted networks.
- Enforce network policies restricting ingress to `backend-api:8443` to authorized service meshes or workload networks.
- Ensure the SPIRE join token is transmitted securely and invalidated immediately upon node attestation.
