# main.py
from adapters.polymarket import fetch_yes_mid

if __name__ == "__main__":
    # Replace this with a real Polymarket market_id (condition_id)
    market_id = "PUT_A_REAL_MARKET_ID_HERE"

    snapshot = fetch_yes_mid(market_id)
    print(snapshot)
