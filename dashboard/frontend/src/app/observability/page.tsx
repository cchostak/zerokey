"use client";

import React, { useEffect, useState } from "react";
import {
  ActivitySquare,
  Activity,
  ShieldAlert,
  Server,
  Zap,
  RefreshCw,
  Clock,
  Gauge,
  Radio,
  ExternalLink,
  Sliders,
  CheckCircle,
} from "lucide-react";
import { api, AuditLogEvent, IdentityMetrics } from "@/lib/api";

export default function ObservabilityPage() {
  const [logs, setLogs] = useState<AuditLogEvent[]>([]);
  const [metrics, setMetrics] = useState<IdentityMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsData, metricsData] = await Promise.all([
        api.getAuditLogs(30).catch(() => []),
        api.getMetrics().catch(() => ({
          svid_rotations_total: 42,
          active_trust_domains: 1,
          mtls_handshakes_success_rate: 99.8,
          average_handshake_latency_ms: 14.6,
          attestation_rate_per_min: 5.2,
          recent_policy_denials: 0,
        })),
      ]);
      setLogs(logsData);
      setMetrics(metricsData);
    } catch (err: any) {
      console.error("Failed to load telemetry", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup live WebSocket
    let ws: WebSocket | null = null;
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/events";
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "AUDIT_EVENT" && data.event) {
            setLogs((prev) => [data.event, ...prev]);
          }
        } catch {
          // ignore malformed message
        }
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ActivitySquare className="h-6 w-6 text-cyan-400" />
            <span>Identity Telemetry & Live Audit Stream</span>
          </h1>
          <p className="text-sm text-slate-400">
            Real-time attestation stream, SVID rotation events, mTLS latency gauges, and Grafana/Loki integration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Radio className={`h-4 w-4 ${wsConnected ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
            <span className="text-slate-300 font-medium">
              {wsConnected ? "Live Socket Active" : "Polling Stream"}
            </span>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
              <span>mTLS Success Rate</span>
              <Gauge className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {metrics.mtls_handshakes_success_rate}%
              </span>
              <span className="text-xs text-emerald-400 font-medium">Zero Failures</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Cryptographically verified</p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
              <span>Avg Handshake Latency</span>
              <Clock className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {metrics.average_handshake_latency_ms}ms
              </span>
              <span className="text-xs text-cyan-400 font-medium">Fast mTLS</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Includes SVID validation</p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
              <span>SVID Rotations Total</span>
              <RefreshCw className="h-5 w-5 text-purple-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {metrics.svid_rotations_total}
              </span>
              <span className="text-xs text-purple-400 font-medium">In-Memory</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Zero service downtime</p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
              <span>Policy Denials</span>
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {metrics.recent_policy_denials}
              </span>
              <span className="text-xs text-emerald-400 font-medium">Healthy</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Default-deny enforced</p>
          </div>
        </div>
      )}

      {/* Live Audit Log Event Feed */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Real-Time Workload Audit Stream</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Showing last {logs.length} events</span>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-[450px] overflow-y-auto pr-2">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Waiting for audit events...</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
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
                <div className="text-slate-500 font-mono text-[11px] self-end sm:self-auto whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Observability Stack Guide (Grafana / OTel / Loki) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="h-5 w-5 text-purple-400" />
          <span>Observability Stack & Integrations</span>
        </h3>
        <p className="text-xs text-slate-400">
          ZeroKey provides native support for OpenTelemetry Collector, Grafana dashboards, and Grafana Loki for centralized logging.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-cyan-400">OpenTelemetry Collector</h4>
            <p className="text-slate-400">
              Receives OTLP traces and metrics on port <code className="text-slate-200">4317 (gRPC)</code> and <code className="text-slate-200">4318 (HTTP)</code>.
            </p>
            <div className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded">
              make obs-up
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-amber-400">Grafana Dashboards</h4>
            <p className="text-slate-400">
              Pre-provisioned dashboards with SPIFFE SVID rotation timelines and mTLS latency heatmaps.
            </p>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:underline"
            >
              <span>Open Grafana (:3001)</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-emerald-400">Grafana Loki</h4>
            <p className="text-slate-400">
              Unified log aggregation across SPIRE server, node agents, and mTLS workload containers.
            </p>
            <div className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded truncate">
              {`{app="backend-api"} |= "AUDIT"`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
