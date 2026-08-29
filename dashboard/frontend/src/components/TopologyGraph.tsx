"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Server,
  Lock,
  Cpu,
  ArrowRight,
  Fingerprint,
  RefreshCw,
  Info,
  CheckCircle2,
} from "lucide-react";
import { OverviewSummary } from "@/lib/api";

interface TopologyGraphProps {
  overview: OverviewSummary | null;
  onRefresh: () => void;
}

export function TopologyGraph({ overview, onRefresh }: TopologyGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string>("server");

  const nodes = [
    {
      id: "server",
      title: "SPIRE Server (CA)",
      role: "Certificate Authority & SQLite Datastore",
      spiffeId: "spiffe://demo.local/spire/server",
      status: overview?.spire_server_healthy ? "healthy" : "offline",
      icon: Server,
      color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-400",
      description:
        "Issues X.509 SVIDs, signs JWT tokens, verifies agent attestation, and maintains the authoritative SPIFFE ID registration database.",
      details: {
        Port: "8081 (gRPC mTLS)",
        Socket: "/run/spire/server-sockets/api.sock",
        CA_TTL: "168h",
        Default_SVID_TTL: "1h",
      },
    },
    {
      id: "agent",
      title: "SPIRE Node Agent",
      role: "Workload Attestor & Workload API Provider",
      spiffeId: "spiffe://demo.local/node/agent",
      status: (overview?.spire_agent_count ?? 0) > 0 ? "healthy" : "offline",
      icon: Cpu,
      color: "from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-400",
      description:
        "Runs on host daemon. Attests calling container processes using Docker socket labels, cgroups, and delivers in-memory SVIDs over unix socket.",
      details: {
        Workload_Socket: "/run/spire/sockets/agent.sock",
        Attestor: "Docker Labels & cgroup inspect",
        Trust_Domain: "demo.local",
      },
    },
    {
      id: "backend",
      title: "Backend API Workload",
      role: "Protected mTLS Service (Go)",
      spiffeId: "spiffe://demo.local/backend-api",
      status: overview?.backend_api_healthy ? "healthy" : "offline",
      icon: Lock,
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400",
      description:
        "Accepts mutual TLS connections on port 8443. Dynamically validates client peer X.509 SVID against authorized client SPIFFE ID.",
      details: {
        Port: "8443 (mTLS HTTPS)",
        Selector: "docker:label:workload:backend-api",
        Allowed_Peer: "spiffe://demo.local/client-worker",
      },
    },
    {
      id: "client",
      title: "Client Worker Workload",
      role: "Keyless mTLS Caller (Go)",
      spiffeId: "spiffe://demo.local/client-worker",
      status: "healthy",
      icon: ShieldCheck,
      color: "from-emerald-500/20 to-cyan-500/20 border-emerald-500/40 text-emerald-400",
      description:
        "Fetches in-memory X.509 SVID from SPIFFE Workload API and executes keyless authenticated requests to protected backend routes without static keys.",
      details: {
        Selector: "docker:label:workload:client-worker",
        Target_URL: "https://backend-api:8443/api/secret-data",
        Rotation: "Automatic in background via go-spiffe/v2",
      },
    },
    {
      id: "oidc",
      title: "SPIRE OIDC Provider",
      role: "Federated Discovery & JWKS",
      spiffeId: "spiffe://demo.local/oidc-provider",
      status: overview?.oidc_healthy ? "healthy" : "offline",
      icon: Fingerprint,
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400",
      description:
        "Publishes standard OpenID Connect discovery endpoints and JSON Web Key Sets (JWKS) for multi-cloud federated verification.",
      details: {
        Port: "8088 (Host) -> 8080 (Internal)",
        Discovery: "/.well-known/openid-configuration",
        JWKS: "/keys",
      },
    },
  ];

  const activeNode = nodes.find((n) => n.id === selectedNode) || nodes[0];

  return (
    <div className="space-y-6">
      {/* Visual Canvas */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Cryptographic Identity Topology</span>
              <span className="text-xs font-normal text-slate-400">
                (Click nodes to inspect identities & sockets)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time trust domain relationships and keyless mTLS channels
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh State</span>
          </button>
        </div>

        {/* Node Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Column 1: Control Plane */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold px-1">
              Identity Control Plane
            </div>
            {/* SPIRE Server */}
            <div
              onClick={() => setSelectedNode("server")}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${
                selectedNode === "server"
                  ? "bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/20"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">SPIRE Server</h4>
                    <p className="text-xs text-slate-400">Root CA & Datastore</p>
                  </div>
                </div>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="mt-3 font-mono text-[11px] text-cyan-300 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 truncate">
                spiffe://demo.local/spire/server
              </div>
            </div>

            {/* OIDC Provider */}
            <div
              onClick={() => setSelectedNode("oidc")}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${
                selectedNode === "oidc"
                  ? "bg-slate-900 border-amber-500 ring-2 ring-amber-500/20"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">OIDC Provider</h4>
                    <p className="text-xs text-slate-400">Discovery & JWKS</p>
                  </div>
                </div>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-3 font-mono text-[11px] text-amber-300 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 truncate">
                http://localhost:8088/keys
              </div>
            </div>
          </div>

          {/* Column 2: Node Attestor Plane */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold px-1">
              Node Attestation Layer
            </div>
            {/* SPIRE Agent */}
            <div
              onClick={() => setSelectedNode("agent")}
              className={`p-5 rounded-xl cursor-pointer border transition-all ${
                selectedNode === "agent"
                  ? "bg-slate-900 border-purple-500 ring-2 ring-purple-500/20"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">SPIRE Node Agent</h4>
                    <p className="text-xs text-slate-400">Docker Attestor Daemon</p>
                  </div>
                </div>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Provides Workload API socket to local container workloads.
              </p>
              <div className="mt-3 font-mono text-[11px] text-purple-300 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 truncate">
                unix:///run/spire/sockets/agent.sock
              </div>
            </div>
          </div>

          {/* Column 3: Workload Pods (mTLS Peers) */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold px-1">
              Attested Workload Services
            </div>
            {/* Backend API */}
            <div
              onClick={() => setSelectedNode("backend")}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${
                selectedNode === "backend"
                  ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">backend-api</h4>
                    <p className="text-xs text-slate-400">mTLS Protected Server (:8443)</p>
                  </div>
                </div>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-3 font-mono text-[11px] text-emerald-300 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 truncate">
                spiffe://demo.local/backend-api
              </div>
            </div>

            {/* Client Worker */}
            <div
              onClick={() => setSelectedNode("client")}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${
                selectedNode === "client"
                  ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">client-worker</h4>
                    <p className="text-xs text-slate-400">mTLS Dynamic Client</p>
                  </div>
                </div>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-3 font-mono text-[11px] text-emerald-300 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 truncate">
                spiffe://demo.local/client-worker
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Flow Line Legend */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Control Plane API</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>Workload Attestation Socket</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Keyless mTLS Verified Channel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>OIDC / JWKS Federation</span>
          </div>
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-900 text-cyan-400 border border-slate-800">
              <activeNode.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">{activeNode.title}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>ONLINE</span>
                </span>
              </div>
              <p className="text-xs font-mono text-cyan-400">{activeNode.spiffeId}</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-300">{activeNode.description}</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(activeNode.details).map(([key, value]) => (
            <div key={key} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[11px] text-slate-400 capitalize">{key.replace(/_/g, " ")}</div>
              <div className="font-mono text-xs text-slate-200 mt-1 truncate">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
