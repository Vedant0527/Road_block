import json
import hashlib
import secrets
import os
from typing import Any, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

MAX_SPEND_LIMIT = float(os.getenv("MAX_SPEND_LIMIT", "1000.00"))
MAX_VENDOR_LIMIT = int(os.getenv("MAX_VENDOR_LIMIT", "5"))
MERCHANT_ALPHA_ID = os.getenv("MERCHANT_ALPHA_ID", "6XBYJ7MLG5LZY")
MERCHANT_BETA_ID = os.getenv("MERCHANT_BETA_ID", "DJL9F2ET8DTLE")

VERIFIED_MERCHANTS: set[str] = {
    MERCHANT_ALPHA_ID,
    MERCHANT_BETA_ID,
    "SELLER_ALPHA_SANDBOX_ID",
    "SELLER_BETA_SANDBOX_ID",
}

class PolicyChecks(BaseModel):
    budget_ok: bool
    vendor_count_ok: bool
    merchants_verified: bool
    total_amount: float
    vendor_count: int
    notes: list[str] = []

class RoadblockSession(BaseModel):
    roadblock_id: str
    payload_hash: str
    raw_payload: dict[str, Any]
    policy_checks: PolicyChecks
    verification_nonce: Optional[str] = None
    status: str = "PENDING_HUMAN_APPROVAL"  # PENDING_HUMAN_APPROVAL, APPROVED, REJECTED, CAPTURED

# In-memory store for active Roadblock sessions
ROADBLOCK_STORE: dict[str, RoadblockSession] = {}

def compute_canonical_hash(payload: dict[str, Any]) -> str:
    """Computes canonical SHA-256 payload hash with sorted keys."""
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

def evaluate_policy(payload: dict[str, Any]) -> PolicyChecks:
    """
    Evaluates policy guardrails:
    a) budget_ok: Total order value <= MAX_SPEND_LIMIT
    b) vendor_count_ok: Number of distinct purchase_units <= MAX_VENDOR_LIMIT
    c) merchants_verified: All payee.merchant_id values belong to the verified merchant registry
    """
    notes = []
    purchase_units = payload.get("purchase_units", [])
    vendor_count = len(purchase_units)

    # 1. Total order value
    total_val = 0.0
    for u in purchase_units:
        val = u.get("amount", {}).get("value", "0.0")
        total_val += float(val)
    total_val = round(total_val, 2)

    budget_ok = total_val <= MAX_SPEND_LIMIT
    if not budget_ok:
        notes.append(f"Total order value ${total_val:.2f} exceeds MAX_SPEND_LIMIT ${MAX_SPEND_LIMIT:.2f}")
    else:
        notes.append(f"Budget check passed (${total_val:.2f} <= ${MAX_SPEND_LIMIT:.2f})")

    # 2. Distinct purchase_units / vendors
    vendor_count_ok = 1 <= vendor_count <= MAX_VENDOR_LIMIT
    if not vendor_count_ok:
        notes.append(f"Vendor count {vendor_count} violates limit [1, {MAX_VENDOR_LIMIT}]")
    else:
        notes.append(f"Vendor count check passed ({vendor_count} units <= {MAX_VENDOR_LIMIT})")

    # 3. Verified merchant registry
    merchants_verified = True
    for idx, u in enumerate(purchase_units):
        m_id = u.get("payee", {}).get("merchant_id")
        if not m_id or m_id not in VERIFIED_MERCHANTS:
            merchants_verified = False
            notes.append(f"Purchase unit {idx} has unverified merchant_id: {m_id}")

    if merchants_verified:
        notes.append("All payee merchant IDs verified in partner registry")

    return PolicyChecks(
        budget_ok=budget_ok,
        vendor_count_ok=vendor_count_ok,
        merchants_verified=merchants_verified,
        total_amount=total_val,
        vendor_count=vendor_count,
        notes=notes
    )

def create_roadblock_session(payload: dict[str, Any]) -> RoadblockSession:
    """
    Creates a new Roadblock session.
    Computes canonical SHA-256 hash, runs policy evaluator, and defaults to PENDING_HUMAN_APPROVAL.
    """
    roadblock_id = f"rb_session_{secrets.token_hex(8)}"
    payload_hash = compute_canonical_hash(payload)
    policy_checks = evaluate_policy(payload)

    session = RoadblockSession(
        roadblock_id=roadblock_id,
        payload_hash=payload_hash,
        raw_payload=payload,
        policy_checks=policy_checks,
        verification_nonce=None,
        status="PENDING_HUMAN_APPROVAL"
    )
    ROADBLOCK_STORE[roadblock_id] = session
    return session

def approve_roadblock_session(roadblock_id: str, client_payload_hash: str) -> dict[str, Any]:
    """
    Verifies that client payload hash matches the sealed stored hash (immutability check).
    Mints a single-use NONCE-... token upon approval.
    """
    if roadblock_id not in ROADBLOCK_STORE:
        raise ValueError(f"Roadblock session '{roadblock_id}' not found.")

    session = ROADBLOCK_STORE[roadblock_id]

    # Verify policy guardrails passed
    if not (session.policy_checks.budget_ok and session.policy_checks.vendor_count_ok and session.policy_checks.merchants_verified):
        raise PermissionError("Cannot approve session: One or more policy guardrails failed.")

    # Cryptographic Hash Immutability Check
    if not secrets.compare_digest(session.payload_hash, client_payload_hash):
        raise ValueError("Payload hash mismatch! Tampering detected: payload modified after session creation.")

    # Mint single-use nonce
    nonce = f"NONCE-{secrets.token_hex(16).upper()}"
    session.verification_nonce = nonce
    session.status = "APPROVED"

    return {
        "status": "APPROVED",
        "roadblock_id": roadblock_id,
        "verification_nonce": nonce,
        "payload_hash": session.payload_hash
    }

def verify_nonce_for_execution(roadblock_id: str, nonce: str, payload: dict[str, Any]) -> bool:
    """
    Validates single-use nonce and re-checks hash against live payload before execution.
    Single-use: consumes the nonce.
    """
    if roadblock_id not in ROADBLOCK_STORE:
        return False

    session = ROADBLOCK_STORE[roadblock_id]

    if session.status != "APPROVED":
        return False

    if not session.verification_nonce or not secrets.compare_digest(session.verification_nonce, nonce):
        return False

    # Ensure live payload hash has not been modified
    current_hash = compute_canonical_hash(payload)
    if not secrets.compare_digest(session.payload_hash, current_hash):
        return False

    # Consume single-use nonce
    session.verification_nonce = None
    session.status = "CAPTURED"
    return True

