import os
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

MERCHANT_ALPHA_ID = os.getenv("MERCHANT_ALPHA_ID", "6XBYJ7MLG5LZY")
MERCHANT_BETA_ID = os.getenv("MERCHANT_BETA_ID", "DJL9F2ET8DTLE")

class CatalogItem(BaseModel):
    id: str
    merchant_id: str
    merchant_name: str
    sku: str
    name: str
    description: str
    category: str
    price: float
    currency: str = "USD"
    stock_status: str = "IN_STOCK"

# 6 realistic items split across Merchant Alpha and Merchant Beta
CATALOG: list[CatalogItem] = [
    # Merchant Alpha - Compute Hardware
    CatalogItem(
        id="alpha-node-01",
        merchant_id=MERCHANT_ALPHA_ID,
        merchant_name="Merchant Alpha - Compute Hardware",
        sku="ALPHA-GPU-CLUSTER-01",
        name="Alpha Tensor TPU Cluster Node",
        description="High-density compute blade for autonomous LLM & agent inference clusters.",
        category="Compute Hardware",
        price=349.00
    ),
    CatalogItem(
        id="alpha-node-02",
        merchant_id=MERCHANT_ALPHA_ID,
        merchant_name="Merchant Alpha - Compute Hardware",
        sku="ALPHA-HSM-VAULT-02",
        name="PCIe Hardware Security Module (HSM)",
        description="Cryptographic hardware accelerator for on-premise payload hash verification.",
        category="Compute Hardware",
        price=189.50
    ),
    CatalogItem(
        id="alpha-node-03",
        merchant_id=MERCHANT_ALPHA_ID,
        merchant_name="Merchant Alpha - Compute Hardware",
        sku="ALPHA-NET-100G-03",
        name="Dual 100GbE Low-Latency SmartNIC",
        description="RDMA RoCEv2 network interface card for distributed multi-agent clusters.",
        category="Compute Hardware",
        price=95.00
    ),

    # Merchant Beta - Edge AI & Robotics Sensors
    CatalogItem(
        id="beta-sensor-01",
        merchant_id=MERCHANT_BETA_ID,
        merchant_name="Merchant Beta - Edge AI & Robotics Sensors",
        sku="BETA-LIDAR-360-01",
        name="Solid-State 3D Flash LiDAR",
        description="Millimeter-accuracy spatial perception sensor for autonomous robot navigation.",
        category="Edge AI & Robotics Sensors",
        price=249.00
    ),
    CatalogItem(
        id="beta-sensor-02",
        merchant_id=MERCHANT_BETA_ID,
        merchant_name="Merchant Beta - Edge AI & Robotics Sensors",
        sku="BETA-IMU-6DOF-02",
        name="Precision 6-DoF Tactile IMU Array",
        description="Micro-electro-mechanical inertial telemetry array for robotic manipulation.",
        category="Edge AI & Robotics Sensors",
        price=48.00
    ),
    CatalogItem(
        id="beta-sensor-03",
        merchant_id=MERCHANT_BETA_ID,
        merchant_name="Merchant Beta - Edge AI & Robotics Sensors",
        sku="BETA-DEPTH-CAM-03",
        name="Active Stereo Edge Depth Camera",
        description="Embedded RGB-D vision module with on-sensor neural stereo depth estimation.",
        category="Edge AI & Robotics Sensors",
        price=135.00
    )
]

def search_catalog(query: str = "", max_price: Optional[float] = None) -> list[CatalogItem]:
    """Search multi-merchant catalog by text and optional maximum price filter."""
    q = query.lower().strip()
    results = CATALOG

    if q:
        results = [
            item for item in results
            if q in item.name.lower()
            or q in item.description.lower()
            or q in item.category.lower()
            or q in item.sku.lower()
            or q in item.merchant_name.lower()
        ]

    if max_price is not None:
        results = [item for item in results if item.price <= max_price]

    return results

def get_catalog_item(item_id: str) -> Optional[CatalogItem]:
    for item in CATALOG:
        if item.id == item_id:
            return item
    return None

