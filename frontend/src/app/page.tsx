"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  ShieldAlert,
  Send,
  AlertTriangle,
  Zap,
  ArrowRight,
  Terminal,
  Layers,
  CheckCircle2,
  Lock,
  Flame,
  Store,
  DollarSign,
  Activity,
  ChevronRight
} from "lucide-react";
import { RoadblockModal } from "@/components/RoadblockModal";
import { AuditLedgerGrid } from "@/components/AuditLedgerGrid";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([
    {
      step: "INIT",
      title: "Roadblock Engine Ready",
      desc: "Grounding multi-vendor catalog (Merchant Alpha & Beta). Zero-Trust interceptor online.",
      time: "12:00:00"
    }
  ]);

  const fetchLedger = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/audit/ledger");
      if (res.ok) {
        const data = await res.json();
        setLedgerEntries(data);
      }
    } catch (err) {
      console.error("Failed to load audit ledger:", err);
    }
  };

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSendPrompt = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setTimeline((prev) => [
      {
        step: "DIRECTIVE",
        title: "Agent Directive Received",
        desc: `"${text}"`,
        time: now
      },
      {
        step: "TOOL",
        title: "Catalog Resolution",
        desc: "Querying multi-merchant inventory & computing payee routes...",
        time: now
      },
      ...prev
    ]);

    try {
      const res = await fetch("http://localhost:8000/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text })
      });
      const data = await res.json();

      setTimeline((prev) => [
        {
          step: "INTERCEPT",
          title: "Roadblock HITL Intercept Active",
          desc: `SHA-256: ${data.payload_hash.slice(0, 16)}... | Status: PENDING_HUMAN_APPROVAL`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        },
        ...prev
      ]);

      setActiveSession(data);
      setModalOpen(true);
      fetchLedger();
    } catch (err: any) {
      setTimeline((prev) => [
        {
          step: "ERROR",
          title: "Execution Error",
          desc: err.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      {/* Precision Top Navbar */}
      <header className="border-b border-[#1c2638] bg-[#0b0f17]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-bold text-white text-xs shadow-sm">
              RB
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-sm tracking-tight text-white font-mono">
                ROADBLOCK
              </span>
              <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-[#141b27] text-slate-400 border border-[#1c2638]">
                ZERO-TRUST COMMERCE PLATFORM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0e131d] border border-[#1c2638] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>PAYPAL ORDERS v2 SANDBOX</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 flex-1 w-full">
        {/* Metric / System Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-mono text-[10px] uppercase">Policy Gate</div>
              <div className="text-sm font-semibold text-white mt-0.5">SHA-256 Sealed</div>
            </div>
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-mono text-[10px] uppercase">Settlement Cut</div>
              <div className="text-sm font-semibold text-white mt-0.5">5.0% Platform Fee</div>
            </div>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-mono text-[10px] uppercase">Merchants Active</div>
              <div className="text-sm font-semibold text-white mt-0.5">Alpha & Beta</div>
            </div>
            <Store className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-mono text-[10px] uppercase">Agent Capture</div>
              <div className="text-sm font-semibold text-rose-400 mt-0.5">HARD-BLOCKED</div>
            </div>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        {/* 2-Column Core Architecture: Presets & Console (7 Cols) + Architecture (5 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Presets + Interactive Agent Terminal (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1-Click Verification Presets */}
            <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1c2638] pb-2">
                <span className="font-mono text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Test Scenarios (1-Click Presets)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">JUDGING SUITE</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Preset 1 */}
                <button
                  onClick={() => handleSendPrompt("Source Enterprise GPU Node (Seller Alpha) + Edge AI Accelerator (Seller Beta)")}
                  disabled={loading}
                  className="p-3 bg-[#080b11] hover:bg-[#0e131d] border border-[#1c2638] hover:border-blue-500/50 rounded-lg text-left transition group space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                    <span className="font-mono text-[11px]">01 / MULTI-VENDOR</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    GPU Node (Alpha) + LiDAR (Beta). Triggers Roadblock HITL Modal.
                  </p>
                </button>

                {/* Preset 2 */}
                <button
                  onClick={() => handleSendPrompt("Attempt Over-Budget Autonomous Purchase ($2,500 Cluster)")}
                  disabled={loading}
                  className="p-3 bg-[#080b11] hover:bg-[#0e131d] border border-[#1c2638] hover:border-amber-500/50 rounded-lg text-left transition group space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-amber-400">
                    <span className="font-mono text-[11px]">02 / SPEND CAP</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Cluster order over $1,000. Triggers Hard Spend Cap Rejection.
                  </p>
                </button>

                {/* Preset 3 */}
                <button
                  onClick={() => handleSendPrompt("Simulate Prompt-Injection Cart Tampering (+$50 Drift)")}
                  disabled={loading}
                  className="p-3 bg-[#080b11] hover:bg-[#0e131d] border border-[#1c2638] hover:border-rose-500/50 rounded-lg text-left transition group space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-rose-400">
                    <span className="font-mono text-[11px]">03 / HASH TAMPER</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Drafts multi-merchant cart. Click &apos;Simulate Tamper&apos; in modal to test block.
                  </p>
                </button>
              </div>
            </div>

            {/* Agent Command Terminal */}
            <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-xs uppercase tracking-wider text-slate-200 font-semibold">
                    Autonomous Agent Terminal
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>READY</span>
                </div>
              </div>

              {/* Input Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendPrompt(prompt)}
                  placeholder="e.g. Procure hardware accelerator from Alpha and robotic sensor from Beta..."
                  className="flex-1 bg-[#080b11] border border-[#1c2638] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition"
                />
                <button
                  onClick={() => handleSendPrompt(prompt)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch</span>
                </button>
              </div>

              {/* Execution Trace */}
              <div className="bg-[#080b11] border border-[#1c2638] rounded-lg p-3 max-h-56 overflow-y-auto space-y-2.5 font-mono text-xs">
                <div className="text-slate-500 text-[10px] uppercase tracking-wider flex items-center justify-between border-b border-[#1c2638] pb-1.5">
                  <span>EXECUTION LOG</span>
                  <span>LATENCY: &lt;15ms</span>
                </div>
                {timeline.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="text-slate-500 text-[10px] shrink-0 pt-0.5">{item.time}</span>
                    <div className="space-y-0.5">
                      <div className="text-slate-200 font-semibold text-[11px]">{item.title}</div>
                      <div className="text-slate-400 text-[10px] leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Architecture Guardrails (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1c2638] pb-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs uppercase tracking-wider text-slate-200 font-semibold">
                  Zero-Trust Architecture Invariants
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-[#080b11] rounded-lg border border-[#1c2638] space-y-1">
                  <div className="font-medium text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-blue-400">01 /</span> SHA-256 Hash Immutability
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Cart payload keys are deterministically sorted and hashed. Any item price or quantity tampering invalidates the signature instantly.
                  </p>
                </div>

                <div className="p-3 bg-[#080b11] rounded-lg border border-[#1c2638] space-y-1">
                  <div className="font-medium text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-amber-400">02 /</span> Multi-Payee Orders v2 Routing
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Native PayPal purchase units routed to Alpha (`6XBYJ7MLG5LZY`) and Beta (`DJL9F2ET8DTLE`) with 5% platform fee deduction.
                  </p>
                </div>

                <div className="p-3 bg-[#080b11] rounded-lg border border-[#1c2638] space-y-1">
                  <div className="font-medium text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-rose-400">03 /</span> Zero Autonomous Capture
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    The AI agent has zero payment capture credentials. Execution halts unconditionally at `PENDING_HUMAN_APPROVAL` until signed in the modal.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Modal Re-Open if active */}
            {activeSession && (
              <div className="p-3.5 bg-[#0e131d] border border-[#27354d] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Pending Authorization</div>
                  <div className="text-[11px] font-mono text-blue-400 truncate max-w-[180px]">{activeSession.roadblock_id}</div>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Open Interceptor
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: AG Grid Settlement & Audit Ledger */}
        <div className="pt-2">
          <AuditLedgerGrid entries={ledgerEntries} onRefresh={fetchLedger} />
        </div>
      </div>

      {/* Roadblock Security Modal */}
      <RoadblockModal
        key={activeSession?.roadblock_id || "modal"}
        sessionData={activeSession}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSessionUpdated={() => {
          fetchLedger();
        }}
      />
    </main>
  );
}
