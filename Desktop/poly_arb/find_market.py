import requests

BASE_URL = "https://clob.polymarket.com"

resp = requests.get(f"{BASE_URL}/markets")
resp.raise_for_status()
markets = resp.json()["data"]  # Access the 'data' key to get the list of markets

# search for our market
for m in markets:
    if "Fed decision in September" in m.get("question", ""):
        print("Found it!")
        print("Question:", m["question"])
        print("Condition ID:", m["condition_id"])
        break
