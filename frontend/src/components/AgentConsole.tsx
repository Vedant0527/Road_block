"use client";

import React, { useState } from "react";
import { Sparkles, ShoppingBag, ShieldCheck, Terminal, Bot } from "lucide-react";

interface AgentConsoleProps {
  onOrderPlanned: (draft: any) => void;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({ onOrderPlanned }) => {
  const [prompt, setPrompt] = useState(
    "Assemble an edge accelerator from Acme and Ethiopian hacker roast coffee from CyberCafe for our sprint."
  );
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "Roadblock Agent ready.",
    "Zero-Trust Policy Engine initialized.",
    "Live PayPal Sandbox connected.",
  ]);

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setLogs((prev) => [
      ...prev,
      `User Prompt: "${prompt}"`,
      "1. Searching multi-merchant catalog across vendors...",
      "2. Building cross-vendor cart & determining payee routing...",
      "3. Generating PayPal Orders v2 payload with multiple purchase_units...",
      "4. Calling Roadblock Policy Engine for cryptographic nonce & SHA-256 hash...",
      "5. HARD-BLOCK ENFORCED: Pausing at PENDING_HUMAN_APPROVAL.",
    ]);

    try {
      const res = await fetch("http://localhost:8000/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error(`Failed to plan order: ${res.statusText}`);
      }

      const draft = await res.json();
      setLogs((prev) => [
        ...prev,
        `✓ Draft created: ${draft.draft_id} | Nonce: ${draft.approval.nonce}`,
        "Roadblock Miniapp Modal activated for human signature.",
      ]);
      onOrderPlanned(draft);
    } catch (err: any) {
      setLogs((prev) => [...prev, `[ERROR]: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Autonomous Commerce Agent</h3>
            <p className="text-xs text-slate-400">Natural language multi-vendor planning with Zero-Trust constraints</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PAYPAL_SANDBOX</span>
        </div>
      </div>

      <form onSubmit={handlePlan} className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Agent Directive / Purchase Request
        </label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans resize-none"
            placeholder="Tell the agent what to procure across vendors..."
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Agent auto-splits cart across Merchant A & Merchant B</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            {loading ? "Planning Multi-Vendor Order..." : "Run Autonomous Agent"}
          </button>
        </div>
      </form>

      {/* Agent Live Telemetry Console */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto">
        <div className="text-slate-500 flex items-center gap-1 mb-2 font-semibold">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span>ROADBLOCK_AGENT_TELEMETRY</span>
        </div>
        {logs.map((log, index) => (
          <div key={index} className="leading-relaxed">
            <span className="text-slate-600 select-none mr-2">&gt;</span>
            <span className={log.startsWith("✓") ? "text-emerald-400" : log.startsWith("[ERROR]") ? "text-red-400" : log.includes("HARD-BLOCK") ? "text-amber-400 font-semibold" : "text-slate-300"}>
              {log}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

