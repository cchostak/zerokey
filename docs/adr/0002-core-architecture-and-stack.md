# ADR 0002: Core Architecture, SPIRE/SPIFFE Keyless Workload Identity, and mTLS Security Boundaries

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Platform Engineering, Security Architecture
- **Consulted:** Backend Engineering, DevOps
- **Informed:** All Contributors

---

## Context and Problem Statement

Modern microservice architectures frequently rely on static API tokens, long-lived X.509 certificates on disk, and shared passwords for service-to-service authentication. These credentials introduce significant operational and security liabilities:
1. **Secret Sprawl:** Secrets are inadvertently committed to Git repositories or baked into Docker image layers.
2. **Rotation Friction:** Manual or scheduled rotation often causes outages or requires synchronized deployments.
3. **Impersonation Vulnerability:** Leaked static credentials can be replayed from arbitrary hosts without proof of process or node authenticity.

ZeroKey requires a cryptographically verifiable, keyless workload authentication framework where workloads receive short-lived, rotatable identities bound to deterministic kernel/container selectors.

---

## Decision Drivers

- **Zero Static Credentials:** No private keys or long-lived credentials stored on container filesystems.
- **Standards Compliance:** Adherence to CNCF **SPIFFE** (Secure Production Identity Framework for Everyone) and **SPIRE** (SPIFFE Runtime Environment).
- **Process Attestation:** Ability to attest calling containers using native kernel / container engine attributes (`/var/run/docker.sock` and Docker label selectors).
- **Dynamic Rotation:** In-memory, non-disruptive certificate rotation without process restarts.
- **Fail-Closed Authorization:** Strict mutual TLS (mTLS) enforcement where only explicitly authorized SPIFFE IDs are permitted.

---

## Considered Options

1. **Static Pre-Shared Certificates on Disk:** Generate certificates with OpenSSL and mount them into containers via Docker volumes.
2. **HashiCorp Vault AppRole / Certificate Engine:** Use Vault AppRole tokens with helper agents to template certificates to disk.
3. **SPIRE / SPIFFE Architecture with Workload API Unix Domain Sockets:** Deploy SPIRE Server as an identity CA and SPIRE Agent as a node daemon exposing the Workload API over a Unix Domain Socket, with applications leveraging `go-spiffe/v2`.

---

## Decision Outcome

Chosen option: **Option 3 (SPIRE / SPIFFE with `go-spiffe/v2` and Unix Domain Sockets)**.

### Architectural Blueprint:
1. **Trust Domain:** `demo.local` configured as the root of trust.
2. **SPIRE Server:** Runs as the central identity authority issuing SVIDs, maintaining SQLite datastore, and managing node attestation via join tokens.
3. **SPIRE Agent:** Runs on the node, attesting itself to SPIRE Server via token, and attesting local containers via the `docker` workload attestor inspecting container labels (`docker:label:workload:*`).
4. **Workload API Socket:** Exposed at `/run/spire/sockets/agent.sock` as a mounted volume. Workloads communicate over this socket using gRPC.
5. **Client & Server Applications:** Written in Go 1.25 utilizing `go-spiffe/v2/workloadapi` and `go-spiffe/v2/spiffetls/tlsconfig`. Certificates and private keys are held strictly in memory and automatically rotated before expiry.
6. **OIDC Discovery Provider:** `spire-oidc` deployed to serve standard OpenID Connect discovery (`/.well-known/openid-configuration`) and published JWKS (`/keys`) for federated multi-cloud authentication.

### Component Diagram:

```
+--------------------------------------------------------------------------+
|                              spire-server                                |
|                       (Trust Domain: demo.local)                         |
|                         CA / Datastore / Keys                            |
+------------------------------------+-------------------------------------+
                                     |
                          gRPC mTLS (Port 8081)
                                     |
+------------------------------------v-------------------------------------+
|                               spire-agent                                |
|                    (Node: spiffe://demo.local/node)                      |
|                  Workload Attestor: /var/run/docker.sock                 |
+------------------------------------+-------------------------------------+
                                     |
                       /run/spire/sockets/agent.sock
                                     |
               +---------------------+---------------------+
               |                                           |
    Fetch X.509 SVID                            Fetch X.509 SVID
               v                                           v
+-----------------------------+             +-----------------------------+
|        client-worker        |  mTLS :8443 |         backend-api         |
|                             | ===========>|                             |
| spiffe://demo.local/        |             | spiffe://demo.local/        |
| client-worker               |             | backend-api                 |
+-----------------------------+             +-----------------------------+
```

---

## Pros and Cons

### Pros
- **Zero Disk Keys:** Private keys are generated in memory and never written to disk, preventing layer inspection attacks.
- **Deterministic Attestation:** Workloads cannot impersonate one another; SPIRE Agent inspects container PID, cgroups, and Docker metadata before issuing SVIDs.
- **Seamless In-Memory Rotation:** Certificates expire in 1 hour; `go-spiffe/v2` streams updated SVIDs automatically over the Workload API.
- **Interoperability:** Native OIDC discovery enables federated authentication to AWS IAM Roles Anywhere, GCP Workload Identity, or Kubernetes clusters.

### Cons
- **Daemon Dependency:** Workloads require the SPIRE Agent daemon socket to be healthy and mounted.
- **Socket Permissions:** Requires appropriate POSIX user/group permissions on Unix Domain Sockets in shared multi-tenant environments.
