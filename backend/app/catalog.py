from app.models import Item
from app.config import settings

# Multi-Merchant catalog with items assigned to Sandbox Merchant A and Merchant B
CATALOG: list[Item] = [
    # Merchant A: Acme Hardware & Cloud Tech (MERCHANT_A_ID: 6XBYJ7MLG5LZY)
    Item(
        id="item-a-01",
        merchant_id=settings.merchant_a_id,
        merchant_name="Acme Edge Cloud & Hardware",
        name="Roadblock Edge TPU Accelerator",
        description="High-speed low-latency inference module for autonomous on-prem agent pipelines.",
        category="Hardware",
        price=149.00,
        currency="USD",
        image_url="https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&q=80"
    ),
    Item(
        id="item-a-02",
        merchant_id=settings.merchant_a_id,
        merchant_name="Acme Edge Cloud & Hardware",
        name="Encrypted Hardware Security Key",
        description="FIDO2 / WebAuthn cryptographic hardware token for cryptographic approval nonces.",
        category="Security",
        price=45.00,
        currency="USD",
        image_url="https://images.unsplash.com/photo-1624969862644-791f3dc98927?w=400&q=80"
    ),
    Item(
        id="item-a-03",
        merchant_id=settings.merchant_a_id,
        merchant_name="Acme Edge Cloud & Hardware",
        name="Cat6a Shielded Agent Gateway Cable",
        description="10-meter industrial braided network patch cord.",
        category="Accessories",
        price=18.50,
        currency="USD",
        image_url="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80"
    ),

    # Merchant B: CyberCafe & Digital Assets (MERCHANT_B_ID: DJL9F2ET8DTLE)
    Item(
        id="item-b-01",
        merchant_id=settings.merchant_b_id,
        merchant_name="CyberCafe Digital Assets",
        name="Micro-Roast Hacker Coffee Subscription",
        description="1kg Single-origin whole bean Ethiopian Yirgacheffe fuel for midnight sprints.",
        category="Fuel",
        price=32.00,
        currency="USD",
        image_url="https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80"
    ),
    Item(
        id="item-b-02",
        merchant_id=settings.merchant_b_id,
        merchant_name="CyberCafe Digital Assets",
        name="Autonomous Agent Telemetry Pro Suite",
        description="Annual cloud observability seat with real-time audit trail and replay debugging.",
        category="Software",
        price=89.00,
        currency="USD",
        image_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80"
    ),
    Item(
        id="item-b-03",
        merchant_id=settings.merchant_b_id,
        merchant_name="CyberCafe Digital Assets",
        name="Ergonomic Desk Mat with Shortcut Keymap",
        description="Non-slip waterproof extended pad with terminal command quick-reference.",
        category="Accessories",
        price=29.50,
        currency="USD",
        image_url="https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=400&q=80"
    )
]

def get_item_by_id(item_id: str) -> Item | None:
    for item in CATALOG:
        if item.id == item_id:
            return item
    return None

def search_catalog(query: str) -> list[Item]:
    q = query.lower().strip()
    if not q:
        return CATALOG
    return [
        item for item in CATALOG
        if q in item.name.lower() or q in item.description.lower() or q in item.category.lower() or q in item.merchant_name.lower()
    ]

