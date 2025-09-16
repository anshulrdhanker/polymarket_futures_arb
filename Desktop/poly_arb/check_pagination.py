import requests

BASE_URL = "https://clob.polymarket.com"

print("Making request to:", f"{BASE_URL}/markets")
resp = requests.get(f"{BASE_URL}/markets")
resp.raise_for_status()
data = resp.json()

print("\nTop-level JSON keys:", list(data.keys()))
print("\nFull response structure:") 
print("-" * 80)
print("{")
for key, value in data.items():
    if key == 'data':
        print(f'  "{key}": [list of {len(value)} markets]')
    else:
        print(f'  "{key}": {value!r}')
print("}")

# If there's a next_cursor, show it
if 'next_cursor' in data and data['next_cursor']:
    print("\nFound next_cursor. You can fetch more results with:")
    print(f"{BASE_URL}/markets?next_cursor={data['next_cursor']}")
else:
    print("\nNo next_cursor found in the response.")
