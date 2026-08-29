"use client";

import React, { useState } from "react";
import {
  Zap,
  Shield,
  Lock,
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  ArrowRight,
  Terminal,
  Code2,
  ShieldAlert,
  Server,
  Cpu,
} from "lucide-react";
import {
  api,
  KeylessTestFlowResponse,
  PolicyEvaluationResponse,
} from "@/lib/api";

export default function PlaygroundPage() {
  const [running, setRunning] = useState<boolean>(false);
  const [simulateUnauthorized, setSimulateUnauthorized] = useState<boolean>(false);
  const [result, setResult] = useState<KeylessTestFlowResponse | null>(null);

  // Policy Sandbox State
  const [candidateSpiffeId, setCandidateSpiffeId] = useState<string>("spiffe://demo.local/client-worker");
  const [requiredSpiffeId, setRequiredSpiffeId] = useState<string>("spiffe://demo.local/client-worker");
  const [policyResult, setPolicyResult] = useState<PolicyEvaluationResponse | null>(null);
  const [evaluatingPolicy, setEvaluatingPolicy] = useState<boolean>(false);

  const handleExecuteTest = async () => {
    try {
      setRunning(true);
      const res = await api.executeTestFlow(simulateUnauthorized);
      setResult(res);
    } catch (err: any) {
      alert("Test execution error: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleEvaluatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEvaluatingPolicy(true);
      const res = await api.evaluatePolicy(candidateSpiffeId, requiredSpiffeId);
      setPolicyResult(res);
    } catch (err: any) {
      alert("Policy evaluation error: " + err.message);
    } finally {
      setEvaluatingPolicy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-cyan-400" />
          <span>Keyless mTLS Live Sandbox & Handshake Inspector</span>
        </h1>
        <p className="text-sm text-slate-400">
          Trigger real-time authenticated mTLS calls from <span className="font-mono text-cyan-400">client-worker</span> to{" "}
          <span className="font-mono text-emerald-400">backend-api</span> without static credentials.
        </p>
      </div>

      {/* Main Execution Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Live Transaction Runner</h2>
            <p className="text-xs text-slate-400">
              Executes workload attestation, SVID acquisition, TLS 1.3 handshake, and peer authorization.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle Simulation */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateUnauthorized}
                onChange={(e) => setSimulateUnauthorized(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Simulate Unauthorized Client</span>
            </label>

            <button
              onClick={handleExecuteTest}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <Play className={`h-4 w-4 ${running ? "animate-spin" : "fill-current"}`} />
              <span>{running ? "Executing Handshake..." : "Trigger Keyless mTLS Call"}</span>
            </button>
          </div>
        </div>

        {/* Handshake Result / Flow Display */}
        {result ? (
          <div className="space-y-6">
            {/* Status Header */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                result.status_code === 200
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.status_code === 200 ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : (
                  <XCircle className="h-6 w-6 text-rose-400" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {result.status_code} {result.status_code === 200 ? "OK — Handshake Successful" : "Forbidden — Access Blocked"}
                  </div>
                  <p className="text-xs">{result.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{result.latency_ms}ms</span>
                </span>
              </div>
            </div>

            {/* Visual Handshake Steps Flowchart */}
            <div>
              <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3">
                Cryptographic Handshake Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {result.handshake_steps.map((step) => (
                  <div
                    key={step.step_number}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between text-xs transition-all ${
                      step.status === "SUCCESS"
                        ? "bg-slate-900/90 border-slate-700/80 hover:border-emerald-500/50"
                        : "bg-rose-950/30 border-rose-800/80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>Step {step.step_number}</span>
                        <span
                          className={`font-bold uppercase ${
                            step.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-100 text-xs">{step.title}</div>
                      <p className="text-[11px] text-slate-400 mt-1">{step.details}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/60 font-mono text-[10px] text-cyan-400 truncate">
                      {step.actor}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Returned Encrypted Payload Viewer */}
            <div>
              <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-cyan-400" />
                <span>Protected Response Payload (Decrypted over TLS 1.3)</span>
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                <pre>{JSON.stringify(result.payload, null, 2)}</pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            Click &quot;Trigger Keyless mTLS Call&quot; above to dispatch a live transaction between workloads.
          </div>
        )}
      </div>

      {/* Policy Authorization Sandbox */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-400" />
            <span>SPIFFE ID Policy Evaluator</span>
          </h2>
          <p className="text-xs text-slate-400">
            Test how the backend authorizer evaluates calling SPIFFE identities and enforces least-privilege access rules.
          </p>
        </div>

        <form onSubmit={handleEvaluatePolicy} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Candidate Client SPIFFE ID
            </label>
            <input
              type="text"
              required
              value={candidateSpiffeId}
              onChange={(e) => setCandidateSpiffeId(e.target.value)}
              placeholder="spiffe://demo.local/client-worker"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Target Backend Policy Required SPIFFE ID
            </label>
            <input
              type="text"
              required
              value={requiredSpiffeId}
              onChange={(e) => setRequiredSpiffeId(e.target.value)}
              placeholder="spiffe://demo.local/client-worker"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={evaluatingPolicy}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20"
            >
              {evaluatingPolicy ? "Evaluating..." : "Evaluate Policy Decision"}
            </button>
          </div>
        </form>

        {policyResult && (
          <div
            className={`p-4 rounded-xl border text-xs ${
              policyResult.allowed
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              {policyResult.allowed ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>POLICY DECISION: ALLOWED (Access Granted)</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-400" />
                  <span>POLICY DECISION: DENIED (Access Blocked)</span>
                </>
              )}
            </div>
            <p>{policyResult.decision_reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
