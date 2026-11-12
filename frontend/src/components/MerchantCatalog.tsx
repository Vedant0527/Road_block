"use client";

import React, { useEffect, useState } from "react";
import { Store, Plus, Check } from "lucide-react";

interface Item {
  id: string;
  merchant_id: string;
  merchant_name: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  image_url?: string;
}

interface MerchantCatalogProps {
  onAddToCart: (item: Item) => void;
}

export const MerchantCatalog: React.FC<MerchantCatalogProps> = ({ onAddToCart }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<string>("ALL");

  useEffect(() => {
    fetch("http://localhost:8000/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading catalog:", err);
        setLoading(false);
      });
  }, []);

  const merchants = ["ALL", ...Array.from(new Set(items.map((i) => i.merchant_name)))];
  const filteredItems = selectedMerchant === "ALL" ? items : items.filter((i) => i.merchant_name === selectedMerchant);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-400" />
            Participating Merchants & Products
          </h3>
          <p className="text-xs text-slate-400">Sandbox Merchant A & Merchant B Multi-Tenant Inventory</p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {merchants.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMerchant(m)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
                selectedMerchant === m
                  ? "bg-blue-600 border-blue-500 text-white font-semibold"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading multi-merchant inventory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono truncate max-w-[130px]">
                    {item.merchant_name.split(" ")[0]}
                  </span>
                </div>
                <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center">
                <div className="font-mono font-bold text-emerald-400 text-base">
                  ${item.price.toFixed(2)}
                  <span className="text-xs text-slate-500 ml-1 font-normal">{item.currency}</span>
                </div>
                <button
                  onClick={() => onAddToCart(item)}
                  className="p-2 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-lg text-slate-300 transition"
                  title="Add to multi-merchant cart"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

