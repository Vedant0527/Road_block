import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from catalog import search_catalog, CATALOG, MERCHANT_ALPHA_ID, MERCHANT_BETA_ID
from roadblock_engine import (
    create_roadblock_session,
    approve_roadblock_session,
    verify_nonce_for_execution,
    compute_canonical_hash,
    ROADBLOCK_STORE
)

def test_catalog_grounding():
    """Verify catalog has 6 items across Merchant Alpha and Merchant Beta."""
    assert len(CATALOG) == 6
    alpha_items = [i for i in CATALOG if i.merchant_id == MERCHANT_ALPHA_ID]
    beta_items = [i for i in CATALOG if i.merchant_id == MERCHANT_BETA_ID]
    assert len(alpha_items) == 3
    assert len(beta_items) == 3

    # Test search
    res = search_catalog(query="sensor")
    assert len(res) >= 1
    assert any("sensor" in i.category.lower() or "sensor" in i.name.lower() for i in res)

    # Test max price filter
    cheap_items = search_catalog(max_price=100.0)
    assert all(i.price <= 100.0 for i in cheap_items)

def test_single_cent_mutation_invalidates_hash_and_blocks_approval():
    """Verifies that mutating a single cent in the payload invalidates the SHA-256 hash and blocks approval."""
    original_payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": "PU-ALPHA-01",
                "payee": {"merchant_id": MERCHANT_ALPHA_ID},
                "amount": {"currency_code": "USD", "value": "189.50"}
            },
            {
                "reference_id": "PU-BETA-01",
                "payee": {"merchant_id": MERCHANT_BETA_ID},
                "amount": {"currency_code": "USD", "value": "48.00"}
            }
        ]
    }

    # 1. Create Roadblock session
    session = create_roadblock_session(original_payload)
    assert session.status == "PENDING_HUMAN_APPROVAL"
    assert session.policy_checks.budget_ok is True
    assert session.policy_checks.vendor_count_ok is True
    assert session.policy_checks.merchants_verified is True
    original_hash = session.payload_hash

    # 2. Mutate a single cent in the client payload: $48.00 -> $48.01
    tampered_payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": "PU-ALPHA-01",
                "payee": {"merchant_id": MERCHANT_ALPHA_ID},
                "amount": {"currency_code": "USD", "value": "189.50"}
            },
            {
                "reference_id": "PU-BETA-01",
                "payee": {"merchant_id": MERCHANT_BETA_ID},
                "amount": {"currency_code": "USD", "value": "48.01"}  # +1 cent tamper
            }
        ]
    }
    tampered_hash = compute_canonical_hash(tampered_payload)
    assert original_hash != tampered_hash, "Single cent mutation MUST yield different SHA-256 hash"

    # 3. Attempt approval with tampered hash -> MUST raise ValueError
    with pytest.raises(ValueError, match="Payload hash mismatch! Tampering detected"):
        approve_roadblock_session(session.roadblock_id, client_payload_hash=tampered_hash)

    # 4. Legit approval with untampered hash -> MUST succeed and mint nonce
    approval_result = approve_roadblock_session(session.roadblock_id, client_payload_hash=original_hash)
    assert approval_result["status"] == "APPROVED"
    nonce = approval_result["verification_nonce"]
    assert nonce.startswith("NONCE-")

    # 5. Execution with tampered payload -> MUST fail
    assert verify_nonce_for_execution(session.roadblock_id, nonce, tampered_payload) is False

    # 6. Execution with untampered original payload -> MUST succeed
    assert verify_nonce_for_execution(session.roadblock_id, nonce, original_payload) is True

    # 7. Nonce is single-use: second execution attempt MUST fail
    assert verify_nonce_for_execution(session.roadblock_id, nonce, original_payload) is False

def test_policy_budget_exceeded():
    """Verify that orders exceeding MAX_SPEND_LIMIT cannot be approved."""
    over_budget_payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": "PU-OVERBUDGET",
                "payee": {"merchant_id": MERCHANT_ALPHA_ID},
                "amount": {"currency_code": "USD", "value": "1500.00"}
            }
        ]
    }
    session = create_roadblock_session(over_budget_payload)
    assert session.policy_checks.budget_ok is False
    with pytest.raises(PermissionError, match="One or more policy guardrails failed"):
        approve_roadblock_session(session.roadblock_id, session.payload_hash)

@pytest.mark.asyncio
async def test_three_judging_presets_end_to_end():
    """Verify all 3 judging presets work end-to-end and record correct ledger statuses."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Preset 1: Multi-Vendor Normal Flow
        r1 = await ac.post("/api/agent/chat", json={
            "prompt": "Source Enterprise GPU Node (Seller Alpha) + Edge AI Accelerator (Seller Beta)"
        })
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["policy_checks"]["budget_ok"] is True
        assert d1["status"] == "PENDING_HUMAN_APPROVAL"
        assert len(d1["merchant_splits"]) == 2

        a1 = await ac.post(f"/api/roadblock/{d1['roadblock_id']}/approve", json={
            "client_payload_hash": d1["payload_hash"]
        })
        assert a1.status_code == 200
        assert a1.json()["verification_nonce"].startswith("NONCE-")

        # Preset 2: Spend Cap Over-Budget Block ($2,500 Cluster)
        r2 = await ac.post("/api/agent/chat", json={
            "prompt": "Attempt Over-Budget Autonomous Purchase ($2,500 Cluster)"
        })
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["policy_checks"]["budget_ok"] is False
        assert d2["policy_checks"]["total_amount"] > 1000.0
        assert all(item["quantity"] == 5 for item in d2["selected_items"])

        a2 = await ac.post(f"/api/roadblock/{d2['roadblock_id']}/approve", json={
            "client_payload_hash": d2["payload_hash"]
        })
        assert a2.status_code == 403

        # Preset 3: SHA-256 Hash Tamper Block
        r3 = await ac.post("/api/agent/chat", json={
            "prompt": "Simulate Prompt-Injection Cart Tampering (+$50 Drift)"
        })
        assert r3.status_code == 200
        d3 = r3.json()
        sealed_hash = d3["payload_hash"]

        t3 = await ac.post(f"/api/roadblock/{d3['roadblock_id']}/tamper")
        assert t3.status_code == 200
        t3_data = t3.json()
        assert t3_data["original_hash"] == sealed_hash
        assert t3_data["tampered_hash"] != sealed_hash

        # Approve with original sealed hash must fail (400) because live payload was tampered
        a3 = await ac.post(f"/api/roadblock/{d3['roadblock_id']}/approve", json={
            "client_payload_hash": sealed_hash
        })
        assert a3.status_code == 400
        assert "Tampering detected" in a3.json()["detail"]

        # Verify ledger recorded events
        ledger = await ac.get("/api/audit/ledger")
        assert ledger.status_code == 200
        event_types = [e["event_type"] for e in ledger.json()]
        assert "ROADBLOCK_TAMPER_BLOCKED" in event_types
        assert "DEMO_PAYLOAD_TAMPER_TRIGGERED" in event_types
        assert "ROADBLOCK_NONCE_MINTED" in event_types

