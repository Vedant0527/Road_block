import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.policy_engine import RoadblockPolicyEngine
from app.models import CartItem, Cart
from app.catalog import CATALOG

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["environment"] == "SANDBOX"

@pytest.mark.asyncio
async def test_catalog_search():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/catalog?query=coffee")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert "coffee" in items[0]["name"].lower()

@pytest.mark.asyncio
async def test_agent_plan_multi_merchant_and_hard_block():
    """Verify agent creates multi-vendor cart and halts at PENDING_HUMAN_APPROVAL."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/agent/plan", json={
            "prompt": "I need edge hardware accelerator and some roast coffee for my sprint team"
        })
    assert response.status_code == 200
    data = response.json()

    # Verify Multi-Merchant routing
    merchants = data["cart"]["merchants"]
    assert len(merchants) >= 2, f"Expected multi-merchant cart, got: {merchants}"

    # Verify Roadblock Guardrails
    assert data["approval"]["status"] == "PENDING_HUMAN_APPROVAL"
    assert data["approval"]["nonce"].startswith("rb_")
    assert len(data["approval"]["payload_hash"]) == 64  # SHA-256

    # Verify multiple purchase units in PayPal payload
    purchase_units = data["order_payload"]["purchase_units"]
    assert len(purchase_units) == 2
    assert "payee" in purchase_units[0]
    assert "merchant_id" in purchase_units[0]["payee"]

@pytest.mark.asyncio
async def test_nonce_verification_and_tamper_protection():
    """Verify tamper protection: invalid nonce is rejected with 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        plan_res = await ac.post("/api/agent/plan", json={
            "prompt": "Get me a security key and coffee"
        })
        draft = plan_res.json()
        draft_id = draft["draft_id"]

        # 1. Attempt approval with wrong nonce
        bad_approval = await ac.post(f"/api/drafts/{draft_id}/approve", json={
            "draft_id": draft_id,
            "nonce": "rb_forged_fake_nonce",
            "user_action": "APPROVE"
        })
        assert bad_approval.status_code == 403

