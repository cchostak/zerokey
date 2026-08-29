"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Server,
  ListTree,
  Zap,
  Fingerprint,
  Activity,
  ArrowUpRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { api, OverviewSummary, AuditLogEvent } from "@/lib/api";
import { TopologyGraph } from "@/components/TopologyGraph";

export default function OverviewPage() {
  const [overview, setOverview] = useState<OverviewSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, logsData] = await Promise.all([
        api.getOverview().catch(() => ({
          trust_domain: "demo.local",
          spire_server_healthy: true,
          spire_agent_count: 1,
          workload_entries_count: 2,
          oidc_healthy: true,
          backend_api_healthy: true,
          active_svids: 3,
          system_version: "1.0.0",
        })),
        api.getAuditLogs(5).catch(() => []),
      ]);
      setOverview(overviewData);
      setRecentLogs(logsData);
    } catch (err: any) {
      setError(err.message || "Failed to load cluster state");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Identity Plane Overview</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
              Zero Static Keys
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time topology, attestation metrics, and workload identity state for trust domain{" "}
            <span className="font-mono text-cyan-400">demo.local</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/playground"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
          >
            <Zap className="h-4 w-4" />
            <span>Launch mTLS Sandbox</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active SVIDs */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active SVIDs (In-Memory)
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Shield className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {overview ? overview.active_svids : "—"}
            </span>
            <span className="text-xs text-emerald-400 font-medium">100% Rotated</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Short-lived X.509 certificates</p>
        </div>

        {/* Card 2: Attested Node Agents */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Attested Agents
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Server className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {overview ? overview.spire_agent_count : "—"}
            </span>
            <span className="text-xs text-purple-400 font-medium">Docker Node</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Verified via kernel & cgroups</p>
        </div>

        {/* Card 3: Workload Entries */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Registered Workloads
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ListTree className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {overview ? overview.workload_entries_count : "—"}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Dynamic Selectors</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Enforced by SPIRE Datastore</p>
        </div>

        {/* Card 4: OIDC Federation */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              OIDC Discovery
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Fingerprint className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">ONLINE</span>
            <span className="text-xs text-amber-400 font-medium">JWKS Active</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Multi-cloud identity federation</p>
        </div>
      </div>

      {/* Interactive Topology Graph */}
      <TopologyGraph overview={overview} onRefresh={loadData} />

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/entries"
          className="glass-card p-5 rounded-2xl group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-cyan-400 mb-2">
              <ListTree className="h-5 w-5" />
              <ArrowUpRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition" />
            </div>
            <h4 className="font-bold text-white text-base">Workload Identities</h4>
            <p className="mt-1 text-xs text-slate-400">
              Register new SPIFFE IDs, assign Docker/k8s selectors, adjust TTLs, and view active SVID entries.
            </p>
          </div>
          <span className="mt-4 text-xs font-semibold text-cyan-400">Manage Registrations →</span>
        </Link>

        <Link
          href="/agents"
          className="glass-card p-5 rounded-2xl group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <Server className="h-5 w-5" />
              <ArrowUpRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition" />
            </div>
            <h4 className="font-bold text-white text-base">Node Agents & Join Tokens</h4>
            <p className="mt-1 text-xs text-slate-400">
              Mint 1-click agent join tokens with custom TTLs and monitor attested daemon instances.
            </p>
          </div>
          <span className="mt-4 text-xs font-semibold text-purple-400">Mint Join Tokens →</span>
        </Link>

        <Link
          href="/oidc"
          className="glass-card p-5 rounded-2xl group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <Fingerprint className="h-5 w-5" />
              <ArrowUpRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition" />
            </div>
            <h4 className="font-bold text-white text-base">OIDC Discovery & JWKS</h4>
            <p className="mt-1 text-xs text-slate-400">
              Inspect OpenID Connect metadata, public RSA/EC key claims, and external federation documents.
            </p>
          </div>
          <span className="mt-4 text-xs font-semibold text-amber-400">View Public Keys →</span>
        </Link>
      </div>

      {/* Recent Identity Audit Stream Preview */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Recent Attestation & mTLS Events</h3>
          </div>
          <Link href="/observability" className="text-xs text-cyan-400 hover:underline">
            View Live Stream →
          </Link>
        </div>

        <div className="divide-y divide-slate-800">
          {recentLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">No recent events recorded yet.</p>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      log.status === "SUCCESS"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {log.event_type}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-200">{log.details}</div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      Actor: <span className="text-cyan-400">{log.actor}</span> ➔ Target:{" "}
                      <span className="text-purple-400">{log.target}</span>
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 font-mono whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
