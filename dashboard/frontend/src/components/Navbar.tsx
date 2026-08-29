"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Network,
  ListTree,
  Server,
  Zap,
  Fingerprint,
  ActivitySquare,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Topology & Cluster", href: "/", icon: Network },
    { name: "Workload Entries", href: "/entries", icon: ListTree },
    { name: "Node Agents & Tokens", href: "/agents", icon: Server },
    { name: "mTLS Sandbox", href: "/playground", icon: Zap },
    { name: "OIDC & JWKS", href: "/oidc", icon: Fingerprint },
    { name: "Telemetry & Audit", href: "/observability", icon: ActivitySquare },
  ];

  return (
    <nav className="border-b border-slate-800 bg-slate-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
