import requests

BASE_URL = "https://clob.polymarket.com"

resp = requests.get(f"{BASE_URL}/markets")
resp.raise_for_status()
markets = resp.json()["data"]

print("First 10 active markets:")
print("-" * 80)
for m in markets[:10]:  # just the first 10 to keep it readable
    print("Question:", m["question"])
    print("Condition ID:", m["condition_id"])
    print("-" * 80)
