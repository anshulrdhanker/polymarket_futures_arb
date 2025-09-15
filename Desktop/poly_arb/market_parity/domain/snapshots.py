# domain/snapshots.py
from dataclasses import dataclass

@dataclass
class PolySnapshot:
    market_id: str     # The Polymarket condition_id (market identifier)
    ts: str            # Timestamp when this snapshot was taken
    yes_bid: float     # Best bid price for YES
    yes_ask: float     # Best ask price for YES
    yes_mid: float     # Midpoint price (average of bid and ask)