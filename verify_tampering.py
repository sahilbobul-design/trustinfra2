import requests
import uuid
import time

BASE_URL = "http://localhost:5000"

def test_tampering():
    print("--- Starting Tampering Verification ---")
    
    # 1. Add Data
    entry_id = str(uuid.uuid4())
    payload = {
        "sensor_data": {"id": "esp32-01", "moisture": 45},
        "entry_id": entry_id
    }
    print(f"\n[Step 1] Adding valid data (ID: {entry_id})...")
    requests.post(f"{BASE_URL}/add-data", json=payload)

    # 2. Validate (Should be Valid)
    print("\n[Step 2] Validating chain (Pre-Tampering)...")
    resp = requests.get(f"{BASE_URL}/validate").json()
    print(f"Is Valid: {resp['is_valid']} - {resp['message']}")

    # 3. Tamper
    print("\n[Step 3] TAMPERING with Block 1...")
    requests.post(f"{BASE_URL}/tamper", json={"index": 1, "new_sensor_data": {"id": "HACKER", "moisture": 999}})

    # 4. Validate (Should be Invalid)
    print("\n[Step 4] Validating chain (Post-Tampering)...")
    resp = requests.get(f"{BASE_URL}/validate").json()
    print(f"Is Valid: {resp['is_valid']} - {resp['message']}")

    if not resp['is_valid']:
        print("\nSUCCESS: System detected tampering successfully!")
    else:
        print("\nFAIL: System failed to detect tampering.")

    # 5. Check logs
    print("\n[Step 5] Checking Suspicious Activity Logs...")
    logs = requests.get(f"{BASE_URL}/logs").json()
    print(f"Logs: {logs}")

if __name__ == "__main__":
    test_tampering()
