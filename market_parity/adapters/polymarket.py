# adapters/polymarket.py
import requests
from domain.snapshots import PolySnapshot
from datetime import datetime, timezone

BASE_URL = "https://clob.polymarket.com"

def fetch_yes_mid(market_id: str) -> PolySnapshot:
    """
    Given a Polymarket market_id (condition_id),
    fetch the YES token's best bid/ask and return a PolySnapshot.
    """
    # Step 1: Fetch the market object
    market_resp = requests.get(f"{BASE_URL}/markets/{market_id}")
    market_resp.raise_for_status()
    market = market_resp.json()

    # Step 2: Find the YES token_id
    yes_token_id = None
    for token in market.get("tokens", []):
        if token.get("outcome") == "YES":
            yes_token_id = token["token_id"]
            break
    if yes_token_id is None:
        raise ValueError(f"No YES token found for market {market_id}")

    # Step 3: Fetch the order book for the YES token
    book_resp = requests.get(f"{BASE_URL}/book?token_id={yes_token_id}")
    book_resp.raise_for_status()
    book = book_resp.json()

    # Step 4: Extract best bid and ask
    best_bid = float(book["bids"][0]["price"]) if book.get("bids") else 0.0
    best_ask = float(book["asks"][0]["price"]) if book.get("asks") else 1.0
    yes_mid = (best_bid + best_ask) / 2

    # Step 5: Return PolySnapshot
    return PolySnapshot(
        market_id=market_id,
        ts=datetime.now(timezone.utc).isoformat(),
        yes_bid=best_bid,
        yes_ask=best_ask,
        yes_mid=yes_mid,
    )
