"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  Send,
  AlertOctagon,
  Flame,
  ArrowRight,
  Terminal,
  Layers,
  Cpu
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
      step: "SYSTEM_INITIALIZED",
      title: "Roadblock Runtime Ready",
      desc: "Grounding multi-merchant catalog (Alpha & Beta). Zero-Trust interceptor active.",
      time: "Now"
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

    // Add prompt to timeline
    setTimeline((prev) => [
      {
        step: "USER_DIRECTIVE",
        title: "Autonomous Agent Invoked",
        desc: `Prompt: "${text}"`,
        time: new Date().toLocaleTimeString()
      },
      {
        step: "TOOL_INVOCATION",
        title: "Tool: search_multi_merchant_catalog",
        desc: "Resolving items across Merchant Alpha & Merchant Beta...",
        time: new Date().toLocaleTimeString()
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
          step: "ROADBLOCK_INTERCEPT",
          title: "Roadblock HITL Intercept Triggered",
          desc: `SHA-256: ${data.payload_hash.slice(0, 16)}... | Status: PENDING_HUMAN_APPROVAL`,
          time: new Date().toLocaleTimeString()
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
          title: "Execution Blocked",
          desc: err.message,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20">
              RB
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                Roadblock
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Zero-Trust Commerce
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Autonomous Multi-Merchant Commerce & Settlement Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>PAYPAL ORDERS v2 SANDBOX</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* 2-Column Grid: Left Panel (Presets & Agent Timeline) + Right Panel (Active Session & Quick Specs) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Autonomous Agent & Quick Presets (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Quick Demo Presets */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                    Judge & Demo 1-Click Execution Presets
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Preset 1 */}
                <button
                  onClick={() => handleSendPrompt("Source Enterprise GPU Node (Seller Alpha) + Edge AI Accelerator (Seller Beta)")}
                  disabled={loading}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left transition space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-blue-400">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" /> Multi-Vendor
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Source GPU Node (Alpha) + LiDAR Sensor (Beta). Passes guardrails -&gt; Triggers HITL Modal.
                  </p>
                </button>

                {/* Preset 2 */}
                <button
                  onClick={() => handleSendPrompt("Attempt Over-Budget Autonomous Purchase ($2,500 Cluster)")}
                  disabled={loading}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-amber-400" /> Spend Cap
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Attempt over-budget cluster purchase ($2,500). Triggers Roadblock Hard Spend Cap Block.
                  </p>
                </button>

                {/* Preset 3 */}
                <button
                  onClick={() => {
                    handleSendPrompt("Simulate Prompt-Injection Cart Tampering (+$50 Drift)");
                  }}
                  disabled={loading}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 rounded-xl text-left transition space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-rose-400">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-400" /> Hash Tamper
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Inject +$50 price drift to demonstrate instant cryptographic SHA-256 seal mismatch alert.
                  </p>
                </button>
              </div>
            </div>

            {/* Custom Interactive Agent Terminal */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Autonomous Commerce Agent Console</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ONLINE
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendPrompt(prompt)}
                  placeholder="Ask the agent to procure hardware across Alpha and Beta..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                />
                <button
                  onClick={() => handleSendPrompt(prompt)}
                  disabled={loading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute</span>
                </button>
              </div>

              {/* Chat Timeline / Tool Trace */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 max-h-72 overflow-y-auto space-y-3 font-mono text-xs">
                <div className="text-slate-500 text-[10px] uppercase font-semibold flex items-center gap-1.5 border-b border-slate-900 pb-2">
                  <Terminal className="w-3 h-3 text-blue-400" />
                  <span>Agent Execution Trace & Tool Router</span>
                </div>
                {timeline.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="text-slate-600 select-none text-[10px] pt-0.5">{item.time}</span>
                    <div className="space-y-0.5">
                      <div className="text-slate-200 font-semibold">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Architecture & Security Invariants (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Zero-Trust Interceptor Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-semibold border-b border-slate-800 pb-2.5 text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Roadblock Policy Guardrails</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-semibold text-white">1. Canonical SHA-256 Seal</div>
                  <p className="text-slate-400 text-[11px]">
                    Every purchase order JSON payload is serialized with deterministic key-sorting and hashed. Any mutation of item quantities or pricing breaks cryptographic verification.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-semibold text-white">2. Multi-Vendor Payee Routing</div>
                  <p className="text-slate-400 text-[11px]">
                    Native PayPal Orders v2 routing per purchase unit to Merchant Alpha (`6XBYJ7MLG5LZY`) and Merchant Beta (`DJL9F2ET8DTLE`) with 5% platform partner settlement cut.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-semibold text-white">3. Zero Autonomous Payment Capture</div>
                  <p className="text-slate-400 text-[11px]">
                    Agent execution halts unconditionally at `PENDING_HUMAN_APPROVAL`. A human must sign the nonced challenge in the Roadblock modal before PayPal creation.
                  </p>
                </div>
              </div>
            </div>

            {/* Re-Open Modal Shortcut if session is active */}
            {activeSession && (
              <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-800/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Active Roadblock Intercept</div>
                  <div className="text-[11px] text-blue-300 font-mono">{activeSession.roadblock_id}</div>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  View Roadblock
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Panel: Live Settlement Ledger (AG Grid) */}
        <div className="pt-2">
          <AuditLedgerGrid entries={ledgerEntries} onRefresh={fetchLedger} />
        </div>
      </div>

      {/* Roadblock Cryptographic Interceptor Modal */}
      <RoadblockModal
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
