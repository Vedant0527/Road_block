import uuid
from typing import Any
from app.models import Cart, CartItem, DraftOrder
from app.catalog import search_catalog, get_item_by_id, CATALOG
from app.policy_engine import RoadblockPolicyEngine
from app.config import settings

class AutonomousCommerceAgent:
    """
    Autonomous Shopping Agent:
    1. Interprets natural language user requirements.
    2. Searches cross-merchant catalog and selects optimal items across vendors.
    3. Assembles multi-merchant cart with payee routing.
    4. Drafts PayPal Orders v2 payload with multiple purchase units.
    5. Calls RoadblockPolicyEngine to enforce security limits and generate an unforgeable nonce.
    6. HARD BLOCK: Halts at PENDING_HUMAN_APPROVAL. Does NOT capture payment.
    """

    @classmethod
    def build_cart_from_items(cls, items_requested: list[tuple[str, int]]) -> Cart:
        cart_items: list[CartItem] = []
        total = 0.0
        merchants = set()
        split_breakdown: dict[str, float] = {}

        for item_id, qty in items_requested:
            item = get_item_by_id(item_id)
            if not item:
                continue
            subtotal = round(item.price * qty, 2)
            cart_items.append(CartItem(item=item, quantity=qty, subtotal=subtotal))
            total += subtotal
            merchants.add(item.merchant_name)
            split_breakdown[item.merchant_name] = round(split_breakdown.get(item.merchant_name, 0.0) + subtotal, 2)

        return Cart(
            items=cart_items,
            total_amount=round(total, 2),
            merchants=list(merchants),
            split_breakdown=split_breakdown
        )

    @classmethod
    def plan_order_from_prompt(cls, prompt: str) -> Cart:
        """
        Parses intent and gathers products from multiple merchants.
        If prompt mentions 'accelerator', 'hardware', or 'coffee', or asks for a bundle,
        it automatically selects across Merchant A and Merchant B.
        """
        p = prompt.lower()
        selected: list[tuple[str, int]] = []

        if "coffee" in p or "fuel" in p:
            selected.append(("item-b-01", 1)) # Micro-Roast Hacker Coffee (Merchant B)
        if "accelerator" in p or "tpu" in p or "hardware" in p:
            selected.append(("item-a-01", 1)) # Edge TPU Accelerator (Merchant A)
        if "security" in p or "key" in p or "fido" in p:
            selected.append(("item-a-02", 1)) # Security Key (Merchant A)
        if "telemetry" in p or "software" in p or "suite" in p:
            selected.append(("item-b-02", 1)) # Telemetry Suite (Merchant B)
        if "cable" in p or "patch" in p:
            selected.append(("item-a-03", 1))
        if "mat" in p or "desk" in p:
            selected.append(("item-b-03", 1))

        # Default multi-merchant demo bundle if no keyword match:
        # Bundles 1 Hardware from Merchant A + 1 Consumable from Merchant B
        if not selected:
            selected = [("item-a-02", 1), ("item-b-01", 1)]

        return cls.build_cart_from_items(selected)

    @classmethod
    def draft_paypal_orders_v2_payload(cls, cart: Cart, draft_id: str) -> dict[str, Any]:
        """
        Builds compliant PayPal Orders v2 payload with multiple purchase_units,
        routing each purchase unit to its designated payee.merchant_id with platform fees.
        """
        # Group items by merchant
        merchant_items: dict[str, list[CartItem]] = {}
        for ci in cart.items:
            m_id = ci.item.merchant_id
            merchant_items.setdefault(m_id, []).append(ci)

        purchase_units = []
        for idx, (m_id, items) in enumerate(merchant_items.items(), start=1):
            unit_subtotal = round(sum(i.subtotal for i in items), 2)
            merchant_name = items[0].item.merchant_name
            partner_fee = round(unit_subtotal * settings.platform_partner_fee_percent, 2)

            purchase_units.append({
                "reference_id": f"PU_{idx}_{m_id[:8]}",
                "description": f"Settlement for {merchant_name} (Multi-Merchant Order)",
                "payee": {
                    "merchant_id": m_id
                },
                "amount": {
                    "currency_code": "USD",
                    "value": f"{unit_subtotal:.2f}",
                    "breakdown": {
                        "item_total": {
                            "currency_code": "USD",
                            "value": f"{unit_subtotal:.2f}"
                        }
                    }
                },
                "items": [
                    {
                        "name": i.item.name,
                        "description": i.item.description[:120],
                        "quantity": str(i.quantity),
                        "unit_amount": {
                            "currency_code": "USD",
                            "value": f"{i.item.price:.2f}"
                        },
                        "category": "PHYSICAL_GOODS" if i.item.category != "Software" else "DIGITAL_GOODS"
                    }
                    for i in items
                ],
                "payment_instruction": {
                    "disbursement_mode": "INSTANT",
                    "platform_fees": [
                        {
                            "amount": {
                                "currency_code": "USD",
                                "value": f"{partner_fee:.2f}"
                            }
                        }
                    ]
                }
            })

        return {
            "intent": "CAPTURE",
            "purchase_units": purchase_units,
            "application_context": {
                "brand_name": "Roadblock Autonomous Commerce",
                "landing_page": "NO_PREFERENCE",
                "user_action": "PAY_NOW",
                "return_url": "https://roadblock.demo/checkout/success",
                "cancel_url": "https://roadblock.demo/checkout/cancel"
            }
        }

    @classmethod
    def execute_agent_pipeline(cls, prompt: str) -> DraftOrder:
        draft_id = f"draft_{uuid.uuid4().hex[:12]}"
        cart = cls.plan_order_from_prompt(prompt)
        payload = cls.draft_paypal_orders_v2_payload(cart, draft_id)
        approval_status = RoadblockPolicyEngine.evaluate_order(cart, payload)

        return DraftOrder(
            draft_id=draft_id,
            cart=cart,
            order_payload=payload,
            approval=approval_status,
            created_at=uuid.uuid1().hex[:8]
        )

