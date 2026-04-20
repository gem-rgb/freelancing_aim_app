import requests, json

print("=== Staff on regular login ===")
r1 = requests.post('http://127.0.0.1:8000/api/auth/login/', json={'username':'admin','password':'admin123'})
print(f"Status: {r1.status_code}")
print(json.dumps(r1.json(), indent=2))

print()
print("=== Staff on staff portal ===")
r2 = requests.post('http://127.0.0.1:8000/api/auth/admin/login/', json={'username':'admin','password':'admin123'})
print(f"Status: {r2.status_code}")
d = r2.json()
print(f"is_staff: {d.get('user',{}).get('is_staff')}")
print(f"has tokens: {'tokens' in d}")
