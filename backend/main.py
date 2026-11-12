import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Optional

from catalog import search_catalog, CATALOG
from roadblock_engine import (
    ROADBLOCK_STORE,
    compute_canonical_hash,
    approve_roadblock_session,
    verify_nonce_for_execution,
    RoadblockSession
)
from paypal_service import create_paypal_sandbox_order, capture_paypal_sandbox_order
from agent_toolkit import orchestrate_agent_prompt, inspect_audit_ledger, record_audit_entry

app = FastAPI(
    title="Roadblock Multi-Merchant Autonomous Settlement Engine",
    version="2.0.0",
    description="Zero-Trust Multi-Merchant Commerce Platform with Cryptographic Roadblock Interceptor and PayPal Orders v2."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str = Field(..., description="Natural language buying directive")

class ApproveRequest(BaseModel):
    client_payload_hash: str

class CheckoutCreateRequest(BaseModel):
    roadblock_id: str
    roadblock_nonce: str

# 1. Health check
@app.get("/healthz")
async def healthz():
    return {
        "status": "healthy",
        "service": "Roadblock Backend",
        "version": "2.0.0",
        "mode": "SANDBOX"
    }

# 2. Catalog listing
@app.get("/api/catalog")
async def get_catalog(query: str = "", max_price: Optional[float] = None):
    return search_catalog(query=query, max_price=max_price)

# 3. Agent chat endpoint
@app.post("/api/agent/chat")
async def agent_chat(req: ChatRequest):
    """Processes user prompt -> selects cross-merchant items -> drafts multi-seller order -> triggers Roadblock Interceptor."""
    result = await orchestrate_agent_prompt(req.prompt)
    return {
        "user_prompt": result.user_prompt,
        "selected_items": result.selected_items,
        "order_payload": result.order_payload,
        "roadblock_id": result.roadblock.roadblock_id,
        "payload_hash": result.roadblock.payload_hash,
        "policy_checks": result.roadblock.policy_checks,
        "merchant_splits": result.merchant_splits,
        "status": result.roadblock.status
    }

# 4. Roadblock approval endpoint
@app.post("/api/roadblock/{roadblock_id}/approve")
async def approve_roadblock(roadblock_id: str, req: ApproveRequest):
    """Verifies SHA-256 hash immutability (both client hash and live payload) and issues single-use verification_nonce."""
    try:
        if roadblock_id in ROADBLOCK_STORE:
            session = ROADBLOCK_STORE[roadblock_id]
            live_hash = compute_canonical_hash(session.raw_payload)
            if live_hash != session.payload_hash:
                record_audit_entry(
                    event_type="ROADBLOCK_TAMPER_BLOCKED",
                    roadblock_id=roadblock_id,
                    payload_hash=live_hash,
                    details={"error": "In-memory payload was tampered after session creation."}
                )
                raise ValueError("Payload hash mismatch! Tampering detected: live payload diverges from sealed SHA-256 hash.")

        result = approve_roadblock_session(roadblock_id, req.client_payload_hash)
        record_audit_entry(
            event_type="ROADBLOCK_NONCE_MINTED",
            roadblock_id=roadblock_id,
            payload_hash=req.client_payload_hash,
            details={"nonce": result["verification_nonce"]}
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

# 5. Tamper demonstration endpoint
@app.post("/api/roadblock/{roadblock_id}/tamper")
async def tamper_roadblock(roadblock_id: str):
    """
    Demo endpoint that intentionally alters item price by +$50 in raw_payload
    while keeping session.payload_hash sealed at its original value,
    guaranteeing a SHA-256 hash mismatch block!
    """
    if roadblock_id not in ROADBLOCK_STORE:
        raise HTTPException(status_code=404, detail="Roadblock session not found.")

    session = ROADBLOCK_STORE[roadblock_id]
    original_hash = session.payload_hash

    # Tamper raw_payload in-place: increase first purchase unit price by $50.00
    if "purchase_units" in session.raw_payload and len(session.raw_payload["purchase_units"]) > 0:
        unit = session.raw_payload["purchase_units"][0]
        cur_val = float(unit["amount"]["value"])
        tampered_val = cur_val + 50.00
        unit["amount"]["value"] = f"{tampered_val:.2f}"
        if "item_total" in unit["amount"].get("breakdown", {}):
            unit["amount"]["breakdown"]["item_total"]["value"] = f"{tampered_val:.2f}"
        if unit.get("items"):
            cur_item_val = float(unit['items'][0]['unit_amount']['value'])
            unit["items"][0]["unit_amount"]["value"] = f"{cur_item_val + 50.0:.2f}"

    new_tampered_hash = compute_canonical_hash(session.raw_payload)
    # DO NOT overwrite session.payload_hash! Keep it sealed so live hash != sealed hash.

    record_audit_entry(
        event_type="DEMO_PAYLOAD_TAMPER_TRIGGERED",
        roadblock_id=roadblock_id,
        payload_hash=new_tampered_hash,
        details={
            "original_hash": original_hash,
            "tampered_hash": new_tampered_hash,
            "tamper_delta": "+$50.00",
            "roadblock_status": "BLOCKED_HASH_MISMATCH"
        }
    )

    return {
        "status": "TAMPERED",
        "roadblock_id": roadblock_id,
        "original_hash": original_hash,
        "tampered_hash": new_tampered_hash,
        "message": "Payload price artificially altered by +$50.00. Live payload hash now diverges from sealed session hash!"
    }

# 5b. Revert tamper endpoint
@app.post("/api/roadblock/{roadblock_id}/revert")
async def revert_roadblock_tamper(roadblock_id: str):
    """Reverts any price tampering back to original sealed values."""
    if roadblock_id not in ROADBLOCK_STORE:
        raise HTTPException(status_code=404, detail="Roadblock session not found.")

    session = ROADBLOCK_STORE[roadblock_id]
    if "purchase_units" in session.raw_payload and len(session.raw_payload["purchase_units"]) > 0:
        unit = session.raw_payload["purchase_units"][0]
        cur_val = float(unit["amount"]["value"])
        reverted_val = max(0.0, cur_val - 50.00)
        unit["amount"]["value"] = f"{reverted_val:.2f}"
        if "item_total" in unit["amount"].get("breakdown", {}):
            unit["amount"]["breakdown"]["item_total"]["value"] = f"{reverted_val:.2f}"
        if unit.get("items"):
            cur_item_val = float(unit['items'][0]['unit_amount']['value'])
            unit["items"][0]["unit_amount"]["value"] = f"{max(0.0, cur_item_val - 50.0):.2f}"

    reverted_hash = compute_canonical_hash(session.raw_payload)
    record_audit_entry(
        event_type="DEMO_PAYLOAD_TAMPER_REVERTED",
        roadblock_id=roadblock_id,
        payload_hash=reverted_hash,
        details={
            "status": "REVERTED_TO_SEALED",
            "roadblock_status": "PASSED"
        }
    )
    return {
        "status": "RESTORED",
        "roadblock_id": roadblock_id,
        "payload_hash": session.payload_hash,
        "live_hash": reverted_hash,
        "is_matching": reverted_hash == session.payload_hash
    }

# 6. PayPal checkout session creation (Requires valid roadblock_id + nonce)
@app.post("/api/checkout/create-order")
async def checkout_create_order(req: CheckoutCreateRequest):
    if req.roadblock_id not in ROADBLOCK_STORE:
        raise HTTPException(status_code=404, detail="Roadblock session not found.")

    session = ROADBLOCK_STORE[req.roadblock_id]

    # Verify nonce & verify live payload hash has not been altered
    verified = verify_nonce_for_execution(req.roadblock_id, req.roadblock_nonce, session.raw_payload)
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nonce verification failed or payload tampered. Roadblock payment execution denied."
        )

    # Dispatch to PayPal Orders v2 Sandbox
    order_res = await create_paypal_sandbox_order(session.raw_payload)
    paypal_order_id = order_res.get("id")

    record_audit_entry(
        event_type="PAYPAL_ORDERS_V2_DISPATCHED",
        roadblock_id=req.roadblock_id,
        payload_hash=session.payload_hash,
        paypal_order_id=paypal_order_id,
        details={"paypal_response": order_res}
    )

    return {
        "status": "ORDER_CREATED",
        "roadblock_id": req.roadblock_id,
        "paypal_order_id": paypal_order_id,
        "paypal_response": order_res
    }

# 7. PayPal order capture
@app.post("/api/checkout/capture-order/{order_id}")
async def checkout_capture_order(order_id: str):
    capture_res = await capture_paypal_sandbox_order(order_id)
    record_audit_entry(
        event_type="PAYPAL_ORDER_CAPTURED",
        paypal_order_id=order_id,
        details={"capture_response": capture_res}
    )
    return {
        "status": "CAPTURED",
        "order_id": order_id,
        "capture_response": capture_res
    }

# 8. Audit ledger endpoint
@app.get("/api/audit/ledger")
async def get_audit_ledger():
    return inspect_audit_ledger()
