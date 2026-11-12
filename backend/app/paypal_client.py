import httpx
from typing import Any
from app.config import settings

class PayPalClient:
    """
    PayPal Orders v2 Client with Multi-Merchant Routing & Platform Settlement Fee Support.
    Includes fail-safe fallback: if a Sandbox secondary merchant or caller lacks partner fee permissions
    (such as PLATFORM_FEES_NOT_SUPPORTED in typical Sandbox developer apps), it automatically
    retries without platform_fees and logs simulated split-settlement metadata cleanly so the demo never crashes.
    """

    def __init__(self):
        self.base_url = settings.api_base_url
        self.client_id = settings.paypal_client_id
        self.client_secret = settings.paypal_client_secret

    async def get_access_token(self) -> str:
        """Fetch an OAuth2 bearer token from PayPal Sandbox."""
        if not self.client_id or not self.client_secret:
            raise ValueError("PayPal Client ID or Secret is missing in environment variables.")

        url = f"{self.base_url}/v1/oauth2/token"
        headers = {"Accept": "application/json", "Accept-Language": "en_US"}
        data = {"grant_type": "client_credentials"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data, auth=(self.client_id, self.client_secret), headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"PayPal OAuth failed with status {resp.status_code}: {resp.text}")
            return resp.json()["access_token"]

    async def create_order(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        Creates a PayPal Orders v2 multi-merchant order.
        If Sandbox rejects platform_fees for unverified secondary merchants,
        gracefully fallbacks to standard multi-unit purchase routing and attaches fee notes.
        """
        token = await self.get_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "PayPal-Request-Id": payload.get("custom_id", f"rb_{secrets_str()}")
        }
        url = f"{self.base_url}/v2/checkout/orders"

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

            if resp.status_code in (200, 201):
                res_data = resp.json()
                res_data["_roadblock_mode"] = "LIVE_SANDBOX_SUCCESS_WITH_FEES"
                return res_data

            # Check if failure is due to platform fees permission in Sandbox
            resp_body = resp.text
            fee_issues = ["PLATFORM_FEES_NOT_SUPPORTED", "PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING", "NOT_ENABLED_FOR_PLATFORM_FEES", "INVALID_PARAMETER_VALUE", "PERMISSION_DENIED"]
            
            if any(issue in resp_body for issue in fee_issues):
                # Fallback: remove payment_instruction (platform_fees) while maintaining separate purchase_units for each merchant
                fallback_payload = dict(payload)
                fallback_units = []
                for unit in payload.get("purchase_units", []):
                    u = dict(unit)
                    u.pop("payment_instruction", None)
                    fallback_units.append(u)
                fallback_payload["purchase_units"] = fallback_units
                headers["PayPal-Request-Id"] = f"rb_retry_{secrets_str()}"

                retry_resp = await client.post(url, json=fallback_payload, headers=headers)
                if retry_resp.status_code in (200, 201):
                    res_data = retry_resp.json()
                    res_data["_roadblock_mode"] = "LIVE_SANDBOX_FALLBACK_SIMULATED_FEES"
                    res_data["_roadblock_note"] = "Live Sandbox order created! 5% platform fees simulated in Roadblock Ledger (Sandbox developer app lacks live marketplace partner role)."
                    return res_data

            # If still failing, return clean diagnostic
            return {
                "error": True,
                "status_code": resp.status_code,
                "details": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp_body,
                "_roadblock_mode": "FAILED"
            }

def secrets_str() -> str:
    import uuid
    return uuid.uuid4().hex[:12]

paypal_client = PayPalClient()
