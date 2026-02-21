import requests
import uuid
import time
import json

BASE_URL = "http://localhost:5000"

def test_system():
    print("--- Starting System Verification ---")
    
    # 1. Add Data
    entry_id_1 = str(uuid.uuid4())
    payload_1 = {
        "sensor_data": {"ldr": 500, "moisture": 30, "risk": 0.1},
        "entry_id": entry_id_1
    }
    print(f"\n[Test 1] Adding Data 1 (ID: {entry_id_1})...")
    resp = requests.post(f"{BASE_URL}/add-data", json=payload_1)
    print(f"Response: {resp.status_code} - {resp.json()}")

    # 2. Anti-Cloning Test (Duplicate UUID)
    print(f"\n[Test 2] Attempting to add duplicate ID (Anti-Cloning)...")
    resp = requests.post(f"{BASE_URL}/add-data", json=payload_1)
    print(f"Response: {resp.status_code} - {resp.json()}")

    # 3. Add Data 2
    entry_id_2 = str(uuid.uuid4())
    payload_2 = {
        "sensor_data": {"ldr": 600, "moisture": 25, "risk": 0.2},
        "entry_id": entry_id_2
    }
    print(f"\n[Test 3] Adding Data 2 (ID: {entry_id_2})...")
    resp = requests.post(f"{BASE_URL}/add-data", json=payload_2)
    print(f"Response: {resp.status_code} - {resp.json()}")

    # 4. Chain Integrity Test
    print("\n[Test 4] Validating Chain Integrity...")
    resp = requests.get(f"{BASE_URL}/validate")
    print(f"Response: {resp.status_code} - {resp.json()}")

    # 5. Fetch Chain
    print("\n[Test 5] Fetching Full Chain...")
    resp = requests.get(f"{BASE_URL}/chain")
    print(f"Response: {resp.status_code} - Blocks items: {len(resp.json()['chain'])}")

    # 6. View Suspicious Logs
    print("\n[Test 6] Fetching Suspicious Logs...")
    resp = requests.get(f"{BASE_URL}/logs")
    print(f"Response: {resp.status_code} - {resp.json()}")

    print("\n--- Verification Script Completed ---")

if __name__ == "__main__":
    try:
        test_system()
    except Exception as e:
        print(f"Error: {e}. Is the server running?")
