import requests
import json

BASE_URL = "https://clob.polymarket.com"

resp = requests.get(f"{BASE_URL}/markets")
resp.raise_for_status()
data = resp.json()

# Pretty-print the top-level structure
print(json.dumps(data, indent=2)[:2000])  # show first ~2000 chars so it's not overwhelming
