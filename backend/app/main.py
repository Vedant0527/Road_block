from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
from app.config import settings
from app.catalog import CATALOG, search_catalog, get_item_by_id
from app.models import (
    Item, CartItemRequest, AgentPromptRequest,
    NonceApprovalRequest, DraftOrder
)
from app.agent import AutonomousCommerceAgent
from app.policy_engine import RoadblockPolicyEngine
from app.paypal_client import paypal_client

app = FastAPI(
    title="Roadblock Autonomous Multi-Merchant Settlement API",
    description="Agentic multi-vendor commerce and settlement platform with Zero-Trust policy engine.",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for active orders and approval nonces
ACTIVE_DRAFTS: dict[str, DraftOrder] = {}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Roadblock Engine",
        "environment": settings.paypal_environment,
        "paypal_client_configured": bool(settings.paypal_client_id),
        "merchants": {
            "merchant_a": settings.merchant_a_id,
            "merchant_b": settings.merchant_b_id
        }
    }

@app.get("/api/catalog", response_model=list[Item])
async def list_catalog(query: str = ""):
    """Retrieve catalog items across all participating merchants."""
    return search_catalog(query)

@app.post("/api/agent/plan", response_model=DraftOrder)
async def agent_plan_order(req: AgentPromptRequest):
    """
    Autonomous Agent Entrypoint:
    Interprets prompt, selects items across merchants, drafts multi-unit PayPal order,
    and returns state halted at PENDING_HUMAN_APPROVAL.
    HARD-BLOCKED: The agent does NOT capture payment.
    """
    draft = AutonomousCommerceAgent.execute_agent_pipeline(req.prompt)
    ACTIVE_DRAFTS[draft.draft_id] = draft
    return draft

@app.post("/api/cart/build-draft", response_model=DraftOrder)
async def build_draft_from_cart(items: list[CartItemRequest]):
    """Manual cart submission to draft a multi-merchant order."""
    item_tuples = [(i.item_id, i.quantity) for i in items]
    cart = AutonomousCommerceAgent.build_cart_from_items(item_tuples)
    draft_id = f"draft_{secrets_token()}"
    payload = AutonomousCommerceAgent.draft_paypal_orders_v2_payload(cart, draft_id)
    approval = RoadblockPolicyEngine.evaluate_order(cart, payload)

    draft = DraftOrder(
        draft_id=draft_id,
        cart=cart,
        order_payload=payload,
        approval=approval,
        created_at=draft_id
    )
    ACTIVE_DRAFTS[draft.draft_id] = draft
    return draft

def secrets_token() -> str:
    import uuid
    return uuid.uuid4().hex[:12]

@app.get("/api/drafts/{draft_id}", response_model=DraftOrder)
async def get_draft_order(draft_id: str):
    if draft_id not in ACTIVE_DRAFTS:
        raise HTTPException(status_code=404, detail="Draft order not found")
    return ACTIVE_DRAFTS[draft_id]

@app.post("/api/drafts/{draft_id}/approve")
async def approve_draft_order(draft_id: str, req: NonceApprovalRequest):
    """
    Roadblock Policy Gate:
    Human approves the cryptographic nonce. If approved, order is submitted to
    PayPal Sandbox /v2/checkout/orders for buyer checkout authorization.
    """
    if draft_id not in ACTIVE_DRAFTS:
        raise HTTPException(status_code=404, detail="Draft order not found")

    draft = ACTIVE_DRAFTS[draft_id]

    if req.user_action.upper() == "REJECT":
        draft.approval.status = "REJECTED"
        draft.approval.guardrail_notes.append("Explicitly rejected by human owner.")
        return {"status": "REJECTED", "draft": draft}

    # Verify Nonce Integrity
    if not RoadblockPolicyEngine.verify_nonce(draft.approval.nonce, req.nonce):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nonce signature verification failed. Possible payload tampering or replay detected."
        )

    # Verify Payload Hash Unaltered
    current_hash = RoadblockPolicyEngine.compute_payload_hash(draft.order_payload)
    if current_hash != draft.approval.payload_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload hash mismatch. The cart was modified after approval nonce generation!"
        )

    draft.approval.status = "APPROVED"
    draft.approval.guardrail_notes.append("Cryptographic nonce verified. Order authorized by human.")

    # Call PayPal Sandbox Orders v2 API with multi-merchant purchase_units
    paypal_res = await paypal_client.create_order(draft.order_payload)
    draft.paypal_order_response = paypal_res
    draft.paypal_order_id = paypal_res.get("id")

    return {
        "status": "APPROVED",
        "draft_id": draft_id,
        "paypal_order_id": draft.paypal_order_id,
        "paypal_response": paypal_res,
        "draft": draft
    }

