import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ZeroKey — SPIRE / SPIFFE Keyless Identity Management Console",
  description: "Enterprise Keyless Workload Authentication and mTLS Observability Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080c14] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <Header />
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>ZeroKey Platform — CNCF SPIFFE & SPIRE Keyless Identity Standard</p>
            <p className="font-mono text-slate-400">Trust Domain: demo.local • v1.0.0</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
