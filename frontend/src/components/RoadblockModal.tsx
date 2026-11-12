"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  Lock,
  AlertTriangle,
  X,
  CreditCard,
  Flame,
  Check,
  Building2,
  Sparkles
} from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface RoadblockModalProps {
  sessionData: any;
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated: (session: any) => void;
}

export const RoadblockModal: React.FC<RoadblockModalProps> = ({
  sessionData,
  isOpen,
  onClose,
  onSessionUpdated,
}) => {
  const [signing, setSigning] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [approvalResult, setApprovalResult] = useState<any | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [tamperedState, setTamperedState] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !sessionData) return null;

  const currentHash = tamperedState ? tamperedState.tampered_hash : sessionData.payload_hash;
  const isHashMismatched = Boolean(tamperedState);

  // 1. Simulate Cart Tampering (+ $50 Drift)
  const handleTamper = async () => {
    setTampering(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/api/roadblock/${sessionData.roadblock_id}/tamper`, {
        method: "POST"
      });
      const data = await res.json();
      setTamperedState(data);
      setErrorMsg("Payload hash mismatch detected! Price altered by +$50.00. Roadblock authorization locked.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setTampering(false);
    }
  };

  // 2. Authorize & Sign Nonce
  const handleAuthorize = async () => {
    setSigning(true);
    setErrorMsg(null);
    try {
      // Use original payload hash to demonstrate cryptographic match/mismatch
      const res = await fetch(`http://localhost:8000/api/roadblock/${sessionData.roadblock_id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_payload_hash: sessionData.payload_hash
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Approval authorization failed");
      }

      setApprovalResult(data);
      onSessionUpdated(data);

      // Now create PayPal Sandbox order using the minted nonce
      const orderRes = await fetch("http://localhost:8000/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadblock_id: sessionData.roadblock_id,
          roadblock_nonce: data.verification_nonce
        })
      });
      const orderData = await orderRes.json();
      if (orderRes.ok) {
        setCreatedOrder(orderData);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSigning(false);
    }
  };

  // 3. Fallback Sandbox Capture Simulator
  const handleSimulatedCapture = async () => {
    if (!createdOrder?.paypal_order_id) return;
    setCapturing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/checkout/capture-order/${createdOrder.paypal_order_id}`, {
        method: "POST"
      });
      const data = await res.json();
      alert(`PayPal Sandbox Multi-Seller Order ${createdOrder.paypal_order_id} captured successfully!`);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Capture simulation failed: ${err.message}`);
    } finally {
      setCapturing(false);
    }
  };

  // Calculate gross and fee
  const grossTotal = sessionData.policy_checks?.total_amount || 0;
  const platformFee = grossTotal * 0.05;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5 border-b border-slate-800 pb-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Roadblock Interceptor</h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PENDING_HUMAN_APPROVAL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Agent execution hard-blocked. Human authorization required before PayPal settlement dispatch.
            </p>
          </div>
        </div>

        {/* Policy Check Badges */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Budget Cap</div>
              <div className="text-white font-semibold">{sessionData.policy_checks?.budget_ok ? "Budget Cap OK" : "OVER LIMIT"}</div>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Routing</div>
              <div className="text-white font-semibold">Multi-Vendor Verified</div>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2 text-xs">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Zero-Trust</div>
              <div className="text-white font-semibold">Agent Capture Blocked</div>
            </div>
          </div>
        </div>

        {/* Cryptographic SHA-256 Payload Hash Card */}
        <div className={`p-4 rounded-2xl border transition ${isHashMismatched ? "bg-rose-950/30 border-rose-500/50" : "bg-slate-950 border-slate-800"} mb-4`}>
          <div className="flex justify-between items-center mb-1 text-xs">
            <span className="text-slate-400 font-medium">Canonical SHA-256 Payload Hash:</span>
            <span className={`font-mono text-xs font-bold ${isHashMismatched ? "text-rose-400 animate-pulse" : "text-blue-400"}`}>
              {isHashMismatched ? "MISMATCH DETECTED (+$50.00)" : "SEALED & IMMUTABLE"}
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-300 bg-black/40 p-2.5 rounded-xl border border-slate-800/80 break-all select-all">
            {currentHash}
          </div>
        </div>

        {/* Per-Merchant purchase_units Breakdown */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Multi-Merchant Settlement Split</span>
            <span className="text-[11px] font-mono text-blue-400">5% Platform Partner Fee</span>
          </div>

          <div className="space-y-2 text-xs">
            {sessionData.selected_items?.map((item: any, i: number) => {
              const subtotal = item.price * (item.quantity || 1);
              const fee = subtotal * 0.05;
              const net = subtotal - fee;
              return (
                <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="space-y-0.5">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{item.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{item.merchant_name}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-white font-bold">${subtotal.toFixed(2)}</div>
                    <div className="text-[10px] text-emerald-400">Net: ${net.toFixed(2)} (Fee: ${fee.toFixed(2)})</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-sm font-bold">
            <span className="text-slate-300">Total Settlement:</span>
            <div className="text-right">
              <span className="text-emerald-400 font-mono text-base">${grossTotal.toFixed(2)} USD</span>
              <div className="text-[10px] text-slate-400 font-normal">Platform Settlement Cut: ${platformFee.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Controls */}
        {!approvalResult ? (
          <div className="flex gap-3">
            <button
              onClick={handleTamper}
              disabled={tampering || isHashMismatched}
              className="w-1/2 py-3 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Flame className="w-4 h-4" />
              <span>Simulate Cart Tampering (+$50)</span>
            </button>
            <button
              onClick={handleAuthorize}
              disabled={signing || isHashMismatched}
              className="w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition disabled:opacity-40"
            >
              <Lock className="w-4 h-4" />
              <span>{signing ? "Authorizing..." : "Authorize & Sign Nonce"}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-emerald-400">
                <Check className="w-4 h-4" /> Nonce Issued: <span className="font-mono font-bold">{approvalResult.verification_nonce}</span>
              </div>
              <div>PayPal Orders v2 Session: <span className="font-mono text-white font-bold">{createdOrder?.paypal_order_id || "Minted"}</span></div>
            </div>

            {/* PayPal Smart Payment Buttons */}
            {createdOrder?.paypal_order_id && (
              <div className="space-y-2">
                <PayPalScriptProvider options={{
                  clientId: "BAAHkxX4JBTB8gyenANxpPt6J6tpoMbF-C6pigd8NufbhjllDTtXoNzaCG5oZDyXPpIirOE8aHr90Vq1Qo",
                  currency: "USD",
                  intent: "capture"
                }}>
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect", label: "pay" }}
                    createOrder={async () => createdOrder.paypal_order_id}
                    onApprove={async (data) => {
                      alert(`PayPal Sandbox Checkout Authorized for Order ${data.orderID}`);
                      onClose();
                    }}
                  />
                </PayPalScriptProvider>

                {/* 1-Click Fallback Simulator */}
                <button
                  onClick={handleSimulatedCapture}
                  disabled={capturing}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>{capturing ? "Capturing Order..." : "1-Click Sandbox Capture Simulator"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
