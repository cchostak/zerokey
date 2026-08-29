# 📖 ZeroKey Glossary — Plain-English Reference

> This document explains every piece of jargon used in ZeroKey's codebase,
> dashboards, and documentation. No cryptography background required.

---

## The Big Picture First

Imagine you work in a large office building. To enter a sensitive room, you show your
**employee badge**. Security checks that the badge is genuine (not a photocopy), is
currently valid (not expired), and belongs to someone with permission for that room.

**ZeroKey does exactly this — but for software services talking to each other.**

Instead of API keys or passwords hardcoded in config files, each container gets a
cryptographically signed **digital badge** (called an SVID) that proves its identity.
The badge is short-lived, lives only in memory, and is automatically renewed before it
expires. No human has to rotate it, and if it leaks — it's worthless within hours.

---

## Core Identity Terms

### SPIFFE
**Secure Production Identity Framework for Everyone**

A CNCF open standard that defines *the rules* for how software services prove who they
are to each other. SPIFFE does not ship code — it defines the specification. Think of it
as the international passport standard: it specifies what a passport must contain and
how to verify one, but it does not print passports.

- **Analogy:** The rules that say "a passport must have a photo, a machine-readable zone,
  and a government signature."
- **Spec document:** https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/

---

### SPIRE
**SPIFFE Runtime Environment**

The *implementation* of the SPIFFE specification. SPIRE is the actual software that:
1. Acts as a Certificate Authority (CA) — the entity that signs and issues credentials.
2. Verifies that a workload is genuine before issuing it a credential.
3. Automatically rotates credentials before they expire.

- **Analogy:** The passport office — it checks your documents, prints the passport,
  and keeps a registry of valid passports.
- **Key components:**
  - `spire-server` — The central authority. Runs once per cluster.
  - `spire-agent` — A daemon on each host machine. Workloads talk to the agent;
    the agent talks to the server.

---

### SPIFFE ID

A globally unique name for a workload, formatted as a URI:

```
spiffe://trust-domain/path/to/workload
```

Example from this project:

```
spiffe://demo.local/backend-api
spiffe://demo.local/client-worker
```

- The part before the path (`demo.local`) is the **Trust Domain** — your organisation's
  namespace.
- The path after it (`/backend-api`) identifies the specific workload.
- **Analogy:** Like an email address — globally unique, but scoped to a domain.
- **Important:** A SPIFFE ID is *just a name*. On its own it proves nothing. What gives it
  authority is the cryptographic credential (SVID) that carries it.

---

### SVID
**SPIFFE Verifiable Identity Document**

The actual *credential* issued by SPIRE that proves a workload's SPIFFE ID. Think of it
as the passport itself — it contains the identity name (SPIFFE ID) and is signed by the
CA so others can verify it.

**Two flavours:**

| Type | Format | Used for |
|---|---|---|
| **X.509-SVID** | A TLS certificate | Mutual TLS connections between services |
| **JWT-SVID** | A JSON Web Token | REST API calls over HTTP |

**Key properties of SVIDs in ZeroKey:**
- **Short-lived** — default TTL is 1 hour; SPIRE renews them ~5 minutes before expiry.
- **In-memory only** — the private key is never written to disk or a file.
- **Automatically rotated** — no human action required.
- **Analogy:** A visitor badge that self-destructs after an hour and is reprinted
  automatically by the front desk before it expires.

---

### X.509

The technical standard for digital certificates — the same format used by every
`https://` website. An X.509-SVID is a regular TLS certificate with one addition:
the **Subject Alternative Name (SAN)** field contains the SPIFFE ID URI instead of a
DNS hostname.

When two services do an mTLS handshake, they each read the other's certificate,
extract the SPIFFE ID from the SAN, and check it against their authorization policy.

---

### TTL — Time To Live

The remaining lifetime of a credential before it expires. In ZeroKey's Grafana
dashboards you will see a **SVID TTL Remaining** panel that counts down from 3600
(1 hour) to 0.

- A short TTL is a security feature — even a stolen credential becomes useless quickly.
- SPIRE rotates SVIDs automatically when ~5 minutes remain, so applications never notice.
- **Analogy:** A parking ticket with a 1-hour limit. The car park warden (SPIRE Agent)
  issues you a new ticket before the old one runs out.

---

## Transport Security Terms

### TLS
**Transport Layer Security**

The cryptographic protocol that secures data in transit. When you connect to an
`https://` website, TLS encrypts the channel between your browser and the server.
By default, only the *server* proves its identity (one-way TLS).

---

### mTLS — Mutual TLS

An extension of TLS where **both sides** must prove their identity with a certificate.

| Normal TLS | Mutual TLS |
|---|---|
| Client checks server's cert | Client checks server's cert AND |
| Server does not check client | Server checks client's cert |
| Only server is authenticated | Both parties are authenticated |

In ZeroKey, `client-worker` and `backend-api` do mTLS. The backend will reject any
connection that does not present a valid SVID for `spiffe://demo.local/client-worker`.
There is no API key. There is no password. The certificate *is* the credential.

- **Analogy:** A high-security building where both the visitor and the guard
  must show valid ID before the door opens.

---

### Workload Attestation

The process SPIRE uses to verify *"is this workload what it claims to be?"* before
issuing an SVID.

In this project, attestation works like this:

1. A container starts and connects to the SPIRE Agent's Unix socket.
2. The Agent inspects `/var/run/docker.sock` to see which container is making the call.
3. It reads the container's Docker labels (e.g. `workload=backend-api`).
4. It checks the label against the registered SPIRE entries.
5. If the label matches, the Agent asks the Server for an SVID and delivers it.

This means a rogue process cannot claim to be `backend-api` unless it is actually
running inside a container with that label — which only the platform can create.

- **Analogy:** A bouncer at a concert who checks your ticket stub, confirms it matches
  your wristband, and only then lets you backstage.

---

## Federation & Token Terms

### OIDC — OpenID Connect

A widely adopted identity federation standard built on top of OAuth 2.0. It lets
services in *different systems* verify a workload's identity without those systems
needing to talk to SPIRE directly.

SPIRE publishes an OIDC discovery endpoint:

```
http://localhost:8088/.well-known/openid-configuration
```

Cloud providers (AWS, GCP, Azure) can fetch this endpoint and use it to validate JWT
tokens issued by SPIRE — enabling **keyless cloud authentication** with no static IAM
access keys.

---

### JWKS — JSON Web Key Set

A public JSON document listing the cryptographic **public keys** that SPIRE uses to
sign JWT tokens. Anyone who wants to verify a JWT fetches the JWKS URL once and uses
the keys to check the signature locally.

```
http://localhost:8088/keys    ← JWKS endpoint in ZeroKey
```

- **Analogy:** A government website that publishes the public stamp design used to
  authenticate official documents. Anyone can check a document against the stamp
  without calling the government.

---

### JWT — JSON Web Token

A compact, portable token format. JWT-SVIDs are used when services communicate over
plain HTTP (REST APIs) rather than raw TLS connections. The token is signed by SPIRE
so that the recipient can verify it came from the right authority.

Structure: `header.payload.signature` — all base64-encoded JSON.

---

### Trust Domain

A namespace boundary for SPIFFE identities — analogous to a DNS domain or an
organisation. In ZeroKey the trust domain is `demo.local`.

Rules:
- A workload in `demo.local` will only trust SVIDs signed by the `demo.local` CA.
- Two separate trust domains can establish **federation** to allow cross-domain trust.
- This prevents one compromised SPIRE deployment from attacking another.

---

### Trust Bundle

A set of Root CA certificates. Workloads receive the trust bundle from their local
SPIRE Agent and use it to verify that the SVID presented by a peer was signed by a
trusted authority.

- **Analogy:** A list of official embassies. Your passport is valid in any country that
  recognises your issuing country's embassy.

---

## Infrastructure & Observability Terms

### Node Agent (`spire-agent`)

A daemon process that runs on every host machine (or as a privileged container). Its jobs:
- Authenticate the host to the SPIRE Server (node attestation).
- Serve the SPIFFE Workload API on a local Unix socket.
- Deliver SVIDs to workloads on demand.
- Stream SVID renewals in the background.

---

### Unix Domain Socket

A special file on the filesystem (ending in `.sock`) that two local processes use as
a communication channel — like a network socket, but only accessible within the same
host.

The Workload API is served at: `/run/spire/sockets/agent.sock`

Workloads connect to it using the `go-spiffe` library (or equivalent). This socket is
*not* accessible over the network, preventing remote attackers from reaching it.

---

### OpenTelemetry (OTel)

A CNCF standard and SDK for emitting telemetry data from services:
- **Traces** — the story of a single request as it flows across services.
- **Metrics** — numeric measurements (counters, gauges, histograms).
- **Logs** — structured event records.

ZeroKey's `otel-collector` receives telemetry on ports `4317` (gRPC) and `4318` (HTTP)
and exports metrics to Prometheus.

---

### Prometheus

An open-source time-series database. It **scrapes** metrics from services at regular
intervals (every 5 seconds in ZeroKey) by calling their `/metrics` HTTP endpoint.

The ZeroKey control-plane API exposes metrics at `http://localhost:8000/metrics`.

Useful metrics in ZeroKey:
- `spiffe_active_svids_total` — how many SVIDs are currently active.
- `mtls_handshake_requests_total` — total mTLS handshake attempts.
- `spiffe_policy_decisions_total` — how many authorization decisions were allow/deny.
- `zerokey_http_requests_total` — control-plane API request volume per endpoint.

---

### Grafana

A dashboarding and visualization tool. It queries Prometheus (for metrics) and Loki
(for logs) and renders charts, gauges, and log panels.

ZeroKey dashboards at **http://localhost:3001**:

| Dashboard | What it shows |
|---|---|
| Identity Plane & mTLS Observability | SVID counts, audit events, API request rates, live logs |
| Workload Identity & SVID Management | SVID TTL countdown, attestation events, identity timeline |
| Keyless mTLS Traffic & Security | Handshake throughput, latency percentiles, policy denials |
| System & Log Telemetry | Container log volume, OIDC traffic, per-endpoint latency, scrape health |

---

### Loki

A log aggregation system from Grafana Labs. Think of it as a searchable, time-indexed
inbox for all container log lines. Unlike Elasticsearch, Loki indexes only the *labels*
(metadata) of log lines, not the full text — making it more efficient for high-volume
container logs.

---

### Promtail

The log-shipping agent. Promtail runs alongside your containers, tails their stdout/stderr
via the Docker socket, and forwards log lines to Loki with structured labels (container
name, workload, etc.).

---

### CA — Certificate Authority

The component of SPIRE Server responsible for signing SVIDs. It holds a root private key
(the "signing key") and uses it to cryptographically endorse each SVID it issues.

Anyone who trusts the CA's public root certificate can verify that an SVID was genuinely
issued by this CA.

---

### CNCF — Cloud Native Computing Foundation

The open-source foundation (under the Linux Foundation) that hosts and governs projects
like Kubernetes, Prometheus, OpenTelemetry, and SPIFFE/SPIRE. Membership and graduation
from CNCF is a signal of project maturity and community adoption.

---

## Quick-Reference Card

```
SPIFFE   = The standard (rules)
SPIRE    = The software (implementation of the rules)
SPIFFE ID = The name  ("spiffe://demo.local/my-service")
SVID     = The badge  (the certificate carrying that name)
X.509    = The format of the badge (like a standard passport size)
TTL      = How long the badge is valid before it must be renewed
mTLS     = Both sides show their badge before talking
Attestation = Verifying a workload really is who it claims to be
Trust Domain = Your organisation's identity namespace ("demo.local")
Trust Bundle = The list of trusted root CAs (who can sign valid badges)
OIDC     = Federation standard for cross-cloud identity verification
JWKS     = Public keys used to verify JWT signatures
JWT      = A token format for REST-API identity claims
OTel     = How telemetry (metrics, traces, logs) gets collected
Prometheus = Stores and queries metrics over time
Grafana  = Draws charts from Prometheus and Loki
Loki     = Stores and queries log lines
Promtail = Collects and ships container logs to Loki
```

---

*For more detail on SPIFFE/SPIRE internals, see the [official SPIFFE documentation](https://spiffe.io/docs/) and the [SPIRE GitHub repository](https://github.com/spiffe/spire).*
