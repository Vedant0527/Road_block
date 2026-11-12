import pytest
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

