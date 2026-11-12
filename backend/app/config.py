import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

class Settings(BaseSettings):
    paypal_environment: str = os.getenv("PAYPAL_ENVIRONMENT", "SANDBOX")
    paypal_client_id: str = os.getenv("PAYPAL_CLIENT_ID", "")
    paypal_client_secret: str = os.getenv("PAYPAL_CLIENT_SECRET", "")
    merchant_a_id: str = os.getenv("MERCHANT_A_ID", "6XBYJ7MLG5LZY")
    merchant_b_id: str = os.getenv("MERCHANT_B_ID", "DJL9F2ET8DTLE")
    platform_partner_fee_percent: float = 0.05  # 5% platform settlement cut

    # Roadblock Guardrails
    max_single_order_amount: float = 500.00
    allowed_currencies: list[str] = ["USD"]

    @property
    def api_base_url(self) -> str:
        if self.paypal_environment.upper() == "LIVE":
            return "https://api-m.paypal.com"
        return "https://api-m.sandbox.paypal.com"

settings = Settings()

