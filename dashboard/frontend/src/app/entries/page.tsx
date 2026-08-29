"use client";

import React, { useEffect, useState } from "react";
import {
  ListTree,
  Plus,
  Trash2,
  Search,
  Shield,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { api, WorkloadEntry, CreateEntryPayload } from "@/lib/api";

export default function EntriesPage() {
  const [entries, setEntries] = useState<WorkloadEntry[]>([]);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateEntryPayload>({
    spiffe_id: "spiffe://demo.local/custom-worker",
    parent_id: "spiffe://demo.local/node/agent",
    selectors: ["docker:label:workload:custom-worker"],
    ttl: 3600,
    admin: false,
    dns_names: ["custom-worker"],
  });
  const [selectorInput, setSelectorInput] = useState<string>("");

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEntries();
      setEntries(data);
    } catch (err: any) {
      setError(err.message || "Failed to load SPIFFE workload entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.createEntry(formData);
      setIsModalOpen(false);
      await loadEntries();
    } catch (err: any) {
      alert("Error creating entry: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entryId: string, spiffeId: string) => {
    if (!confirm(`Are you sure you want to revoke and delete entry for ${spiffeId}?`)) {
      return;
    }
    try {
      await api.deleteEntry(entryId);
      await loadEntries();
    } catch (err: any) {
      alert("Failed to delete entry: " + err.message);
    }
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.spiffe_id.toLowerCase().includes(search.toLowerCase()) ||
      entry.selectors.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
      entry.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ListTree className="h-6 w-6 text-cyan-400" />
            <span>Workload Identity Registrations</span>
          </h1>
          <p className="text-sm text-slate-400">
            Authoritative SPIFFE IDs, parent node attestation boundaries, and container selectors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadEntries}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh Entries"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Register Workload</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by SPIFFE ID, selector (e.g. docker:label:...), or Entry ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none w-full"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Entries List Table / Cards */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Minted SPIFFE ID</th>
                <th className="py-3.5 px-4">Parent Node ID</th>
                <th className="py-3.5 px-4">Attestation Selectors</th>
                <th className="py-3.5 px-4">TTL (SVID)</th>
                <th className="py-3.5 px-4">Entry ID</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading SPIRE registration entries...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No workload entries match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{entry.spiffe_id}</span>
                      </div>
                      {entry.dns_names && entry.dns_names.length > 0 && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          DNS: {entry.dns_names.join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{entry.parent_id}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {entry.selectors.map((sel, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300"
                          >
                            {sel}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{entry.ttl}s</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{entry.id}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(entry.id, entry.spiffe_id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                        title="Revoke / Delete Entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ListTree className="h-5 w-5 text-cyan-400" />
                <span>Register Workload Identity</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Workload SPIFFE ID URI
                </label>
                <input
                  type="text"
                  required
                  value={formData.spiffe_id}
                  onChange={(e) => setFormData({ ...formData, spiffe_id: e.target.value })}
                  placeholder="spiffe://demo.local/custom-worker"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Parent Node SPIFFE ID
                </label>
                <input
                  type="text"
                  required
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  placeholder="spiffe://demo.local/node/agent"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Attestation Selectors (e.g. docker:label:workload:..., k8s:ns:..., unix:uid:...)
                </label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {formData.selectors.map((sel, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-mono flex items-center gap-1"
                      >
                        <span>{sel}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              selectors: formData.selectors.filter((_, i) => i !== idx),
                            })
                          }
                          className="hover:text-rose-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectorInput}
                      onChange={(e) => setSelectorInput(e.target.value)}
                      placeholder="docker:label:app:custom-worker"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (selectorInput.trim()) {
                          setFormData({
                            ...formData,
                            selectors: [...formData.selectors, selectorInput.trim()],
                          });
                          setSelectorInput("");
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    X.509 SVID TTL (Seconds)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={86400}
                    value={formData.ttl}
                    onChange={(e) => setFormData({ ...formData, ttl: parseInt(e.target.value) || 3600 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    DNS SAN Name
                  </label>
                  <input
                    type="text"
                    value={formData.dns_names?.[0] || ""}
                    onChange={(e) => setFormData({ ...formData, dns_names: [e.target.value] })}
                    placeholder="custom-worker"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || formData.selectors.length === 0}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {submitting ? "Registering..." : "Create SPIFFE Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
