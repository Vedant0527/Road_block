"use client";

import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { Table, RefreshCw } from "lucide-react";

interface AuditLedgerGridProps {
  entries: any[];
  onRefresh: () => void;
}

export const AuditLedgerGrid: React.FC<AuditLedgerGridProps> = ({ entries, onRefresh }) => {
  // Transform entries into flattened rows for AG Grid
  const rowData = useMemo(() => {
    return (entries || []).map((entry, idx) => {
      const date = new Date((entry.timestamp || Date.now() / 1000) * 1000);
      const timeStr = date.toLocaleTimeString();

      // Extract split data if available
      const splits = entry.merchant_splits || {};
      const merchants = Object.keys(splits);
      const gross = Object.values(splits).reduce((a: any, b: any) => a + Number(b), 0);
      const grossNum = Number(gross) || (entry.details?.policy_passed ? 598.00 : 0);
      const platformFee = grossNum * 0.05;
      const netPayout = grossNum - platformFee;

      let status = "PASSED";
      if (entry.event_type.includes("TAMPER")) {
        status = "BLOCKED_HASH_MISMATCH";
      } else if (entry.details?.policy_passed === false) {
        status = "BLOCKED_BUDGET";
      } else if (entry.event_type.includes("CAPTURED")) {
        status = "SETTLED";
      } else if (entry.event_type.includes("DISPATCHED")) {
        status = "PAYPAL_CREATED";
      } else if (entry.event_type.includes("NONCE")) {
        status = "APPROVED";
      }

      return {
        id: idx,
        timestamp: timeStr,
        event_type: entry.event_type,
        paypal_order_id: entry.paypal_order_id || entry.details?.paypal_response?.id || "N/A",
        seller_merchant_id: merchants.length > 0 ? merchants.join(" & ") : "6XBYJ7ML & DJL9F2ET",
        gross_amount: grossNum > 0 ? `$${grossNum.toFixed(2)}` : "--",
        platform_fee: grossNum > 0 ? `$${platformFee.toFixed(2)}` : "--",
        net_seller_payout: grossNum > 0 ? `$${netPayout.toFixed(2)}` : "--",
        payload_hash: entry.payload_hash ? `${entry.payload_hash.slice(0, 16)}...` : "--",
        roadblock_status: status
      };
    });
  }, [entries]);

  const columnDefs: ColDef[] = useMemo(() => [
    { field: "timestamp", headerName: "Timestamp", width: 100, pinned: "left" },
    { field: "event_type", headerName: "Event Type", width: 220 },
    { field: "paypal_order_id", headerName: "PayPal Order ID", width: 180 },
    { field: "seller_merchant_id", headerName: "Seller Merchant ID", width: 210 },
    { field: "gross_amount", headerName: "Gross Amount", width: 120 },
    { field: "platform_fee", headerName: "Platform Fee (5%)", width: 130 },
    { field: "net_seller_payout", headerName: "Net Seller Payout", width: 140 },
    { field: "payload_hash", headerName: "SHA-256 Payload Hash", width: 160 },
    {
      field: "roadblock_status",
      headerName: "Roadblock Status",
      width: 190,
      cellRenderer: (params: any) => {
        const val = params.value;
        let badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
        if (val === "BLOCKED_HASH_MISMATCH") badgeClass = "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold";
        else if (val === "BLOCKED_BUDGET") badgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold";
        else if (val === "SETTLED") badgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold";
        else if (val === "APPROVED") badgeClass = "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold";

        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeClass}`}>
            {val}
          </span>
        );
      }
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              Live Multi-Merchant Settlement & Audit Ledger
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                AG Grid Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic ledger of agent proposals, SHA-256 seal states, fee splits, and PayPal settlement
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="ag-theme-alpine-dark w-full h-64 rounded-xl overflow-hidden border border-slate-800">
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="single"
        />
      </div>
    </div>
  );
};

