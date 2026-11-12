from typing import Any, Optional
from pydantic import BaseModel, Field

class Item(BaseModel):
    id: str
    merchant_id: str
    merchant_name: str
    name: str
    description: str
    category: str
    price: float
    currency: str = "USD"
    image_url: Optional[str] = None

class CartItemRequest(BaseModel):
    item_id: str
    quantity: int = 1

class AgentPromptRequest(BaseModel):
    prompt: str = Field(..., description="Natural language prompt describing what to buy across vendors")

class CartItem(BaseModel):
    item: Item
    quantity: int
    subtotal: float

class Cart(BaseModel):
    items: list[CartItem]
    total_amount: float
    merchants: list[str]
    split_breakdown: dict[str, float]

class ApprovalStatus(BaseModel):
    status: str  # PENDING_HUMAN_APPROVAL, APPROVED, REJECTED
    nonce: str
    payload_hash: str
    guardrails_passed: bool
    guardrail_notes: list[str] = []

class NonceApprovalRequest(BaseModel):
    draft_id: str
    nonce: str
    user_action: str = Field(..., description="'APPROVE' or 'REJECT'")
    user_signature: Optional[str] = None

class DraftOrder(BaseModel):
    draft_id: str
    cart: Cart
    order_payload: dict[str, Any]
    approval: ApprovalStatus
    created_at: str
    paypal_order_id: Optional[str] = None
    paypal_order_response: Optional[dict[str, Any]] = None

