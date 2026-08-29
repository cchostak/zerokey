"use client";

import React, { useEffect, useState } from "react";
import {
  Server,
  Key,
  Copy,
  Check,
  Shield,
  Clock,
  Cpu,
  RefreshCw,
  Plus,
  X,
  Terminal,
} from "lucide-react";
import { api, NodeAgent, GenerateTokenResponse } from "@/lib/api";

export default function AgentsPage() {
  const [agents, setAgents] = useState<NodeAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [tokenSpiffeId, setTokenSpiffeId] = useState<string>("spiffe://demo.local/node/agent-new");
  const [tokenTtl, setTokenTtl] = useState<number>(600);
  const [mintedToken, setMintedToken] = useState<GenerateTokenResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await api.getAgents();
      setAgents(data);
    } catch (err: any) {
      console.error("Failed to load agents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleMintToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.generateToken({
        spiffe_id: tokenSpiffeId,
        ttl: tokenTtl,
      });
      setMintedToken(res);
    } catch (err: any) {
      alert("Error minting token: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Server className="h-6 w-6 text-purple-400" />
            <span>SPIRE Node Agents & Join Tokens</span>
          </h1>
          <p className="text-sm text-slate-400">
            Attested host nodes running the SPIRE Agent daemon and issuing local SVIDs via Workload API.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAgents}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh Agents"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setMintedToken(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all"
          >
            <Key className="h-4 w-4" />
            <span>Mint Agent Join Token</span>
          </button>
        </div>
      </div>

      {/* Agents Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 glass-panel p-8 text-center text-slate-400">
            Loading attested node agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="col-span-2 glass-panel p-8 text-center text-slate-400">
            No active node agents found. Run &apos;make bootstrap&apos; or mint a join token below.
          </div>
        ) : (
          agents.map((agent, idx) => (
            <div key={idx} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                    <Cpu className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Node Agent</h3>
                    <div className="font-mono text-xs text-purple-400 truncate max-w-xs">
                      {agent.spiffe_id}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ATTESTED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[11px] block">Attestation Serial</span>
                  <span className="font-mono text-slate-200 truncate block mt-0.5">
                    {agent.serial_number || "83940182947192"}
                  </span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[11px] block">Attestation Plugin</span>
                  <span className="font-mono text-cyan-400 block mt-0.5">join_token (Docker)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Workload Socket: /run/spire/sockets/agent.sock</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mint Join Token Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-purple-400" />
                <span>Mint Node Agent Join Token</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!mintedToken ? (
              <form onSubmit={handleMintToken} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Agent Node SPIFFE ID
                  </label>
                  <input
                    type="text"
                    required
                    value={tokenSpiffeId}
                    onChange={(e) => setTokenSpiffeId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Token Lifetime TTL (Seconds)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={3600}
                    value={tokenTtl}
                    onChange={(e) => setTokenTtl(parseInt(e.target.value) || 600)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-500/20"
                  >
                    {submitting ? "Minting Token..." : "Generate One-Time Token"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <div className="font-bold text-sm mb-1">Join Token Minted Successfully!</div>
                  <p className="text-xs">
                    Use this token once to attest a new SPIRE Agent node for identity{" "}
                    <span className="font-mono">{mintedToken.spiffe_id}</span>.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">One-Time Join Token:</label>
                  <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-cyan-400">
                    <span className="flex-1 truncate">{mintedToken.token}</span>
                    <button
                      onClick={() => copyToClipboard(mintedToken.token)}
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-300"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    Docker Run Launch Command:
                  </label>
                  <div className="flex items-start gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                    <span className="flex-1">{mintedToken.docker_command}</span>
                    <button
                      onClick={() => copyToClipboard(mintedToken.docker_command)}
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-300"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
