"use client";

import React, { useEffect, useState } from "react";
import {
  Fingerprint,
  Key,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Code2,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  api,
  OIDCDiscoveryDoc,
  JWKSResponse,
  TrustBundle,
} from "@/lib/api";

export default function OIDCPage() {
  const [discoveryDoc, setDiscoveryDoc] = useState<OIDCDiscoveryDoc | null>(null);
  const [jwks, setJwks] = useState<JWKSResponse | null>(null);
  const [bundle, setBundle] = useState<TrustBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadOIDC = async () => {
    try {
      setLoading(true);
      const [discData, jwksData, bundleData] = await Promise.all([
        api.getOIDCDiscovery(),
        api.getJWKS(),
        api.getTrustBundle(),
      ]);
      setDiscoveryDoc(discData);
      setJwks(jwksData);
      setBundle(bundleData);
    } catch (err: any) {
      console.error("Failed to fetch OIDC information", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOIDC();
  }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Fingerprint className="h-6 w-6 text-amber-400" />
            <span>OIDC Discovery & JWKS Federation</span>
          </h1>
          <p className="text-sm text-slate-400">
            Standard OpenID Connect metadata, published JSON Web Key Sets, and SPIFFE Trust Bundles for external verifiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOIDC}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh OIDC Keys"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <a
            href="http://localhost:8088/.well-known/openid-configuration"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Raw Discovery Endpoint</span>
          </a>
        </div>
      </div>

      {/* Discovery Metadata Box */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-400" />
          <span>OpenID Connect Discovery Document (.well-known/openid-configuration)</span>
        </h3>

        {discoveryDoc ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[11px] block">Issuer URL</span>
              <span className="font-mono text-cyan-400 block mt-1 truncate">
                {discoveryDoc.issuer}
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[11px] block">JWKS URI</span>
              <span className="font-mono text-amber-400 block mt-1 truncate">
                {discoveryDoc.jwks_uri}
              </span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[11px] block">Supported Signing Algs</span>
              <span className="font-mono text-slate-200 block mt-1 truncate">
                {discoveryDoc.id_token_signing_alg_values_supported.join(", ")}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Loading discovery document...</p>
        )}
      </div>

      {/* Published JWKS Keys */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-cyan-400" />
            <span>Published JWKS Public Keys (/keys)</span>
          </h3>
          <span className="text-xs text-slate-400">
            {jwks?.keys.length || 0} active public key(s)
          </span>
        </div>

        {jwks && jwks.keys.length > 0 ? (
          <div className="space-y-4">
            {jwks.keys.map((key, idx) => (
              <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono text-[10px] font-bold">
                      {key.alg || "RS256"}
                    </span>
                    <span className="font-mono text-slate-300 font-semibold">
                      kid: {key.kid || "unknown"}
                    </span>
                  </div>
                  <button
                    onClick={() => copyText(JSON.stringify(key, null, 2), key.kid || String(idx))}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-900 px-2 py-1 rounded"
                  >
                    {copiedKey === (key.kid || String(idx)) ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>Copy JWK JSON</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">Key Type (kty)</span>
                    <span className="text-slate-200">{key.kty}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">Usage (use)</span>
                    <span className="text-slate-200">{key.use || "sig"}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded col-span-2">
                    <span className="text-slate-500 block text-[10px]">Public Exponent (e)</span>
                    <span className="text-slate-200">{key.e || "AQAB"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No published keys returned from OIDC provider.</p>
        )}
      </div>

      {/* SPIFFE Trust Domain Root Certificate Bundle */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span>Root CA Trust Domain Bundle (demo.local)</span>
          </h3>
          <button
            onClick={() => copyText(bundle?.x509_authorities_pem.join("\n") || "", "bundle")}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            {copiedKey === "bundle" ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>Copy PEM Certificate</span>
          </button>
        </div>

        {bundle && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-400 overflow-x-auto">
            <pre>{bundle.x509_authorities_pem.join("\n")}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
