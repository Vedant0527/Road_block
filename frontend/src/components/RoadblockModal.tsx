"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  Lock,
  AlertTriangle,
  X,
  CreditCard,
  Building2,
  ArrowRight,
  Fingerprint,
  Zap,
  Terminal
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
      setErrorMsg("PAYLOAD TAMPER DETECTED: Price altered by +$50.00. Live payload diverges from sealed SHA-256 seal.");
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
      await res.json();
      alert(`PayPal Sandbox Multi-Seller Order ${createdOrder.paypal_order_id} captured successfully!`);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Capture simulation failed: ${err.message}`);
    } finally {
      setCapturing(false);
    }
  };

  const grossTotal = sessionData.policy_checks?.total_amount || 0;
  const platformFee = grossTotal * 0.05;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#141b27] transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Top Bar */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1c2638]">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-white font-mono">
                Roadblock Security Gateway
              </h2>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 uppercase">
                PENDING_HUMAN_APPROVAL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous execution hard-blocked. Verify multi-vendor split and cryptographic seal before signing.
            </p>
          </div>
        </div>

        {/* System Checks Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <div className="bg-[#080b11] border border-[#1c2638] rounded-lg p-2.5 text-xs">
            <div className="text-slate-400 font-mono text-[10px] uppercase">Spend Cap</div>
            <div className="flex items-center gap-1.5 mt-1 font-semibold text-white">
              <CheckCircle2 className={`w-3.5 h-3.5 ${sessionData.policy_checks?.budget_ok ? "text-emerald-400" : "text-rose-400"}`} />
              <span>{sessionData.policy_checks?.budget_ok ? "Under $1,000" : "OVER BUDGET"}</span>
            </div>
          </div>
          <div className="bg-[#080b11] border border-[#1c2638] rounded-lg p-2.5 text-xs">
            <div className="text-slate-400 font-mono text-[10px] uppercase">Routing</div>
            <div className="flex items-center gap-1.5 mt-1 font-semibold text-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Vendor Split</span>
            </div>
          </div>
          <div className="bg-[#080b11] border border-[#1c2638] rounded-lg p-2.5 text-xs">
            <div className="text-slate-400 font-mono text-[10px] uppercase">Agent Permissions</div>
            <div className="flex items-center gap-1.5 mt-1 font-semibold text-white">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Capture Denied</span>
            </div>
          </div>
        </div>

        {/* Cryptographic SHA-256 Seal Card */}
        <div className={`p-3.5 rounded-lg border font-mono text-xs mb-5 transition-colors ${
          isHashMismatched
            ? "bg-rose-950/30 border-rose-800/80"
            : "bg-[#080b11] border-[#1c2638]"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
              <span>CANONICAL SHA-256 PAYLOAD HASH:</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              isHashMismatched
                ? "bg-rose-900/60 text-rose-300 border-rose-700 animate-pulse"
                : "bg-[#141b27] text-blue-400 border-[#27354d]"
            }`}>
              {isHashMismatched ? "TAMPER DETECTED" : "IMMUTABLE SEAL"}
            </span>
          </div>
          <div className="bg-[#05070a] p-2 rounded border border-[#1c2638] text-[11px] text-slate-300 break-all select-all">
            {currentHash}
          </div>
        </div>

        {/* Multi-Merchant Split Breakdown */}
        <div className="bg-[#080b11] border border-[#1c2638] rounded-lg p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#1c2638] pb-2 font-mono">
            <span>SETTLEMENT SCHEDULE (PAYPAL ORDERS v2)</span>
            <span className="text-amber-400">5% PLATFORM FEE</span>
          </div>

          <div className="space-y-2">
            {sessionData.selected_items?.map((item: any, i: number) => {
              const subtotal = item.price * (item.quantity || 1);
              const fee = subtotal * 0.05;
              const net = subtotal - fee;
              return (
                <div key={i} className="flex justify-between items-center p-2 rounded bg-[#0e131d] border border-[#1c2638] text-xs">
                  <div>
                    <div className="font-medium text-slate-100 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{item.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">x{item.quantity || 1}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.merchant_name}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-semibold text-slate-100">${subtotal.toFixed(2)}</div>
                    <div className="text-[10px] text-emerald-400">Net: ${net.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2.5 border-t border-[#1c2638] flex justify-between items-center text-xs">
            <span className="font-mono text-slate-400">AGGREGATE SETTLEMENT:</span>
            <div className="text-right font-mono">
              <span className="text-base font-bold text-emerald-400">${grossTotal.toFixed(2)} USD</span>
              <div className="text-[10px] text-slate-400">Includes ${platformFee.toFixed(2)} Platform Settlement Cut</div>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-2 mb-5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-mono text-[11px]">{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        {!approvalResult ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleTamper}
              disabled={tampering || isHashMismatched}
              className="py-2.5 px-3 rounded-lg border border-rose-800/50 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-mono font-medium flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Tamper (+$50)</span>
            </button>
            <button
              onClick={handleAuthorize}
              disabled={signing || isHashMismatched || !sessionData.policy_checks?.budget_ok}
              className="py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-40 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{signing ? "Signing..." : "Sign Nonce & Dispatch"}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs space-y-1 font-mono">
              <div className="font-semibold flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CHALLENGE SIGNED: {approvalResult.verification_nonce}</span>
              </div>
              <div className="text-slate-300">
                PayPal Orders v2 Session: <span className="font-bold text-white">{createdOrder?.paypal_order_id || "Active"}</span>
              </div>
            </div>

            {createdOrder?.paypal_order_id && (
              <div className="space-y-2 pt-1">
                <PayPalScriptProvider options={{
                  clientId: "BAAHkxX4JBTB8gyenANxpPt6J6tpoMbF-C6pigd8NufbhjllDTtXoNzaCG5oZDyXPpIirOE8aHr90Vq1Qo",
                  currency: "USD",
                  intent: "capture"
                }}>
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect", label: "pay", height: 40 }}
                    createOrder={async () => createdOrder.paypal_order_id}
                    onApprove={async (data) => {
                      alert(`PayPal Sandbox Checkout Authorized for Order ${data.orderID}`);
                      onClose();
                    }}
                  />
                </PayPalScriptProvider>

                <button
                  onClick={handleSimulatedCapture}
                  disabled={capturing}
                  className="w-full py-2 px-3 rounded-lg border border-[#1c2638] bg-[#141b27] hover:bg-[#1c2638] text-slate-300 text-xs font-mono flex items-center justify-center gap-2 transition"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{capturing ? "Capturing..." : "1-Click Sandbox Capture Simulator"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
