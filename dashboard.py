import requests
import json
import os
import time

BASE_URL = "http://localhost:5000"

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def fetch_stats():
    try:
        chain_resp = requests.get(f"{BASE_URL}/chain").json()
        valid_resp = requests.get(f"{BASE_URL}/validate").json()
        logs_resp = requests.get(f"{BASE_URL}/logs").json()
        
        return {
            "length": chain_resp['length'],
            "is_valid": valid_resp['is_valid'],
            "suspicious_count": len(logs_resp['suspicious_activity']),
            "last_block_hash": chain_resp['chain'][-1]['hash'] if chain_resp['chain'] else "N/A"
        }
    except Exception as e:
        return None

def dashboard():
    while True:
        clear_screen()
        print("="*40)
        print("   TRUST INFRA - BLOCKCHAIN DASHBOARD   ")
        print("="*40)
        
        stats = fetch_stats()
        if stats:
            print(f" Status: {'[ SECURE ]' if stats['is_valid'] else '[ TAMPERED ]'}")
            print(f" Chain Length: {stats['length']} blocks")
            print(f" Suspicious Activities: {stats['suspicious_count']}")
            print(f" Latest Hash: {stats['last_block_hash'][:20]}...")
            print("-" * 40)
            print(" [A] Add Dummy Data  [V] View Chain  [Q] Quit")
        else:
            print(" Error: Could not connect to backend.")
            print(" Make sure 'python app.py' is running.")
            print("\n [Q] Quit")

        choice = input("\nChoice: ").lower()
        if choice == 'q':
            break
        elif choice == 'a':
            import uuid
            payload = {
                "sensor_data": {"manual": "entry", "timestamp": time.time()},
                "entry_id": str(uuid.uuid4())
            }
            requests.post(f"{BASE_URL}/add-data", json=payload)
        elif choice == 'v':
            chain_resp = requests.get(f"{BASE_URL}/chain").json()
            print(json.dumps(chain_resp['chain'], indent=2))
            input("\nPress Enter to return...")

if __name__ == "__main__":
    dashboard()
