"use client";

import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { Table, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";

interface AuditLedgerGridProps {
  entries: any[];
  onRefresh: () => void;
}

export const AuditLedgerGrid: React.FC<AuditLedgerGridProps> = ({ entries, onRefresh }) => {
  const rowData = useMemo(() => {
    return (entries || []).map((entry, idx) => {
      const date = new Date((entry.timestamp || Date.now() / 1000) * 1000);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
        paypal_order_id: entry.paypal_order_id || entry.details?.paypal_response?.id || "--",
        seller_merchant_id: merchants.length > 0 ? merchants.join(" + ") : "Alpha & Beta",
        gross_amount: grossNum > 0 ? `$${grossNum.toFixed(2)}` : "--",
        platform_fee: grossNum > 0 ? `$${platformFee.toFixed(2)}` : "--",
        net_seller_payout: grossNum > 0 ? `$${netPayout.toFixed(2)}` : "--",
        payload_hash: entry.payload_hash ? `${entry.payload_hash.slice(0, 14)}...` : "--",
        roadblock_status: status
      };
    });
  }, [entries]);

  const columnDefs: ColDef[] = useMemo(() => [
    { 
      field: "timestamp", 
      headerName: "TIME", 
      width: 110, 
      pinned: "left",
      cellClass: "font-mono text-slate-400 text-[11px]" 
    },
    { 
      field: "event_type", 
      headerName: "SYSTEM EVENT", 
      width: 250,
      cellRenderer: (p: any) => (
        <span className="font-mono text-[11px] text-slate-200">
          {p.value}
        </span>
      )
    },
    { 
      field: "paypal_order_id", 
      headerName: "PAYPAL ORDER ID", 
      width: 190,
      cellClass: "font-mono text-blue-400 font-medium text-[11px]"
    },
    { 
      field: "seller_merchant_id", 
      headerName: "SETTLED MERCHANTS", 
      width: 240,
      cellClass: "text-slate-300 text-[11px]"
    },
    { 
      field: "gross_amount", 
      headerName: "GROSS", 
      width: 110,
      cellClass: "font-mono font-semibold text-slate-100 text-right text-[11px]"
    },
    { 
      field: "platform_fee", 
      headerName: "FEE (5%)", 
      width: 110,
      cellClass: "font-mono text-amber-400 text-right text-[11px]"
    },
    { 
      field: "net_seller_payout", 
      headerName: "NET PAYOUT", 
      width: 120,
      cellClass: "font-mono font-semibold text-emerald-400 text-right text-[11px]"
    },
    { 
      field: "payload_hash", 
      headerName: "SHA-256 SEAL", 
      width: 150,
      cellClass: "font-mono text-slate-400 text-[11px]"
    },
    {
      field: "roadblock_status",
      headerName: "POLICY VERDICT",
      width: 200,
      pinned: "right",
      cellRenderer: (params: any) => {
        const val = params.value;
        let badgeStyle = "bg-blue-950/40 text-blue-400 border-blue-800/40";
        if (val === "BLOCKED_HASH_MISMATCH") badgeStyle = "bg-rose-950/60 text-rose-300 border-rose-800/60 font-semibold";
        else if (val === "BLOCKED_BUDGET") badgeStyle = "bg-amber-950/60 text-amber-300 border-amber-800/60 font-semibold";
        else if (val === "SETTLED") badgeStyle = "bg-emerald-950/60 text-emerald-300 border-emerald-800/60 font-semibold";
        else if (val === "APPROVED") badgeStyle = "bg-indigo-950/60 text-indigo-300 border-indigo-800/60 font-semibold";

        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] border tracking-wider ${badgeStyle}`}>
              {val === "BLOCKED_HASH_MISMATCH" || val === "BLOCKED_BUDGET" ? (
                <AlertTriangle className="w-3 h-3 text-current shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
              )}
              {val}
            </span>
          </div>
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
    <div className="bg-[#0b0f17] border border-[#1c2638] rounded-xl overflow-hidden shadow-2xl">
      {/* Table Header Bar */}
      <div className="px-5 py-3.5 bg-[#0e131d] border-b border-[#1c2638] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#141b27] border border-[#27354d] flex items-center justify-center text-slate-300">
            <Table className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-200">
                Settlement & Audit Ledger
              </h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#141b27] text-slate-400 border border-[#1c2638]">
                AG GRID v32
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Immutable ledger of agent orders, cryptographic hash seals, partner splits, and PayPal order status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            {rowData.length} recorded events
          </div>
          <button
            onClick={onRefresh}
            className="px-2.5 py-1.5 bg-[#141b27] hover:bg-[#1c2638] text-slate-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 border border-[#1c2638] transition"
          >
            <RefreshCw className="w-3 h-3 text-slate-400" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="ag-theme-alpine-dark w-full h-64">
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowSelection="single"
          headerHeight={34}
          rowHeight={36}
        />
      </div>
    </div>
  );
};
