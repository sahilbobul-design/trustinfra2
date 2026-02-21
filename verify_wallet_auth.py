import hashlib
import requests
import json

# Simulated credentials
PRIVATE_KEY = "hackathon_secret_key_123"
WALLET_ADDRESS = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
BASE_URL = "http://localhost:5000"

def simulate_meta_mask_signing(message):
    """
    Simulates the process of signing a message with a private key.
    In a real app, this happens inside MetaMask (client-side).
    """
    # Create a hash of the message + private key
    signature = hashlib.sha256((message + PRIVATE_KEY).encode()).hexdigest()
    return signature

def test_auth():
    print("--- MetaMask Auth Simulation ---")
    
    # 1. User wants to authenticate
    message = f"Login to TrustInfra at {WALLET_ADDRESS}"
    print(f"Message to sign: {message}")
    
    # 2. Simulate signing
    signature = simulate_meta_mask_signing(message)
    print(f"Generated Signature: {signature}")
    
    # 3. Send to backend
    payload = {
        "wallet_address": WALLET_ADDRESS,
        "signature": signature
    }
    
    print("\nSending auth request to backend...")
    resp = requests.post(f"{BASE_URL}/auth-sim", json=payload)
    
    if resp.status_code == 200:
        print(f"Success! Backend Response: {resp.json()}")
    else:
        print(f"Failed! Backend Response: {resp.json()}")

if __name__ == "__main__":
    test_auth()
