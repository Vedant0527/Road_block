import os
import json
import httpx
from typing import Any, Optional
from pydantic import BaseModel
from catalog import search_catalog, CATALOG, CatalogItem
from paypal_service import build_multi_seller_order_payload
from roadblock_engine import create_roadblock_session, RoadblockSession

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# In-memory Audit Ledger for multi-merchant settlements & Roadblock intercepts
AUDIT_LEDGER: list[dict[str, Any]] = []

def record_audit_entry(
    event_type: str,
    roadblock_id: Optional[str] = None,
    payload_hash: Optional[str] = None,
    paypal_order_id: Optional[str] = None,
    merchant_splits: Optional[dict[str, float]] = None,
    details: Optional[dict[str, Any]] = None
) -> dict[str, Any]:
    import time
    entry = {
        "timestamp": time.time(),
        "event_type": event_type,
        "roadblock_id": roadblock_id,
        "payload_hash": payload_hash,
        "paypal_order_id": paypal_order_id,
        "merchant_splits": merchant_splits or {},
        "details": details or {}
    }
    AUDIT_LEDGER.append(entry)
    return entry

def search_multi_merchant_catalog(query: str, max_price: Optional[float] = None) -> list[dict[str, Any]]:
    items = search_catalog(query=query, max_price=max_price)
    return [i.model_dump() for i in items]

def draft_multi_seller_order(items: list[dict[str, Any]], platform_fee_percent: float = 0.05) -> dict[str, Any]:
    return build_multi_seller_order_payload(items, currency="USD", platform_fee_percent=platform_fee_percent)

def inspect_audit_ledger() -> list[dict[str, Any]]:
    return list(reversed(AUDIT_LEDGER))

class AgentPlanResult(BaseModel):
    user_prompt: str
    selected_items: list[dict[str, Any]]
    order_payload: dict[str, Any]
    roadblock: RoadblockSession
    merchant_splits: dict[str, float]

def deterministic_intent_parser(prompt: str) -> list[dict[str, Any]]:
    """
    Deterministic intent parser fallback: Works 100% offline without LLM API keys.
    Selects items across Merchant Alpha (Compute Hardware) and Merchant Beta (Robotics & Sensors).
    """
    p = prompt.lower()
    selected: list[CatalogItem] = []

    # Check for budget limit in prompt if specified (e.g. "under $400")
    import re
    max_price = None
    match = re.search(r"under\s+\$?(\d+)", p)
    if match:
        max_price = float(match.group(1))

    # Match items
    for item in CATALOG:
        # Check keywords
        item_words = item.name.lower().split() + item.category.lower().split()
        if any(w in p for w in item_words if len(w) > 3):
            if max_price is None or item.price <= max_price:
                selected.append(item)

    # Ensure cross-merchant representation if user asked for both or general setup
    merchants_found = {i.merchant_id for i in selected}
    if len(merchants_found) < 2:
        # Pick 1 item from Alpha and 1 from Beta
        alpha_default = next(i for i in CATALOG if "compute" in i.category.lower())
        beta_default = next(i for i in CATALOG if "sensor" in i.category.lower())
        selected = [alpha_default, beta_default]

    is_over_budget_demo = any(k in p for k in ["2,500", "2500", "over-budget", "over budget", "massive"])
    qty_multiplier = 5 if is_over_budget_demo else 1

    return [
        {
            "id": i.id,
            "sku": i.sku,
            "name": i.name,
            "price": i.price,
            "merchant_id": i.merchant_id,
            "merchant_name": i.merchant_name,
            "category": i.category,
            "quantity": qty_multiplier
        }
        for i in selected
    ]

async def orchestrate_agent_prompt(prompt: str) -> AgentPlanResult:
    """
    Processes user prompt -> selects cross-merchant items -> drafts multi-seller order
    -> triggers Roadblock Interceptor -> returns roadblock_id, payload_hash, policy_checks, and split.
    """
    selected_items = deterministic_intent_parser(prompt)

    # Build multi-seller order payload
    order_payload = draft_multi_seller_order(selected_items)

    # Intercept with Roadblock Policy Engine (computes SHA-256 hash, generates session)
    roadblock = create_roadblock_session(order_payload)

    # Calculate merchant splits
    splits: dict[str, float] = {}
    for item in selected_items:
        m_name = item.get("merchant_name", item.get("merchant_id"))
        splits[m_name] = round(splits.get(m_name, 0.0) + (float(item["price"]) * int(item.get("quantity", 1))), 2)

    # Record in Audit Ledger
    record_audit_entry(
        event_type="AGENT_ORDER_PROPOSAL_INTERCEPTED",
        roadblock_id=roadblock.roadblock_id,
        payload_hash=roadblock.payload_hash,
        merchant_splits=splits,
        details={
            "prompt": prompt,
            "policy_passed": roadblock.policy_checks.budget_ok and roadblock.policy_checks.vendor_count_ok,
            "item_count": len(selected_items)
        }
    )

    return AgentPlanResult(
        user_prompt=prompt,
        selected_items=selected_items,
        order_payload=order_payload,
        roadblock=roadblock,
        merchant_splits=splits
    )

