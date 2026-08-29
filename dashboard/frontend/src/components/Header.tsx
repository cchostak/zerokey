"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Key, RefreshCw, Activity, Terminal } from "lucide-react";

export function Header() {
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/events";
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Key className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">ZeroKey</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                SPIFFE Control Plane
              </span>
            </div>
            <p className="text-xs text-slate-400">Keyless Identity & mTLS Management Console</p>
          </div>
        </div>

        {/* Global Status Bar */}
        <div className="flex items-center space-x-4">
          {/* Trust Domain Pill */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400">Trust Domain:</span>
            <span className="font-mono text-cyan-400 font-medium">demo.local</span>
          </div>

          {/* Live Sync Status */}
          <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                wsConnected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-amber-400"
              }`}
            />
            <span className="text-slate-300 font-medium">{wsConnected ? "Live Stream Active" : "Polling Mode"}</span>
          </div>

          {/* Quick CLI docs */}
          <Link
            href="/playground"
            className="flex items-center space-x-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Test mTLS Flow</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
