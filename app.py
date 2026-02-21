from flask import Flask, request, jsonify
from blockchain import Blockchain
import uuid
import datetime
import json
import os

app = Flask(__name__)

# Initialize Blockchain
trust_chain = Blockchain()

# Simple logging for suspicious activity with persistence
LOG_FILE = "suspicious_activity.json"

def load_logs():
    try:
        with open(LOG_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

suspicious_logs = load_logs()

def log_suspicious(activity, details):
    log_entry = {
        "timestamp": str(datetime.datetime.now()),
        "activity": activity,
        "details": details
    }
    suspicious_logs.append(log_entry)
    with open(LOG_FILE, "w") as f:
        json.dump(suspicious_logs, f, indent=4)
    print(f"ALERT: {activity} - {details}")

@app.route('/add-data', methods=['POST'])
def add_data():
    data = request.get_json()
    
    if not data or 'sensor_data' not in data:
        return jsonify({"message": "Invalid input, sensor_data required"}), 400
    
    # Check for entry_id (Anti-Cloning)
    entry_id = data.get('entry_id')
    if not entry_id:
        return jsonify({"message": "entry_id (UUID) is required for anti-cloning"}), 400

    success, message = trust_chain.add_block(data['sensor_data'], entry_id)
    
    if not success:
        log_suspicious("Anti-Cloning Triggered", f"Attempted duplicate entry with ID: {entry_id}")
        return jsonify({"message": message}), 409
    
    return jsonify({"message": message, "block_index": trust_chain.get_latest_block().index}), 201

@app.route('/chain', methods=['GET'])
def get_chain():
    return jsonify({
        "length": len(trust_chain.chain),
        "chain": trust_chain.get_chain()
    }), 200

@app.route('/validate', methods=['GET'])
def validate_chain():
    is_valid, message = trust_chain.is_chain_valid()
    if not is_valid:
        log_suspicious("Blockchain Tampered", message)
    return jsonify({"is_valid": is_valid, "message": message}), 200

@app.route('/logs', methods=['GET'])
def get_logs():
    return jsonify({"suspicious_activity": suspicious_logs}), 200

# Bonus: Wallet-based signing simulator
@app.route('/auth-sim', methods=['POST'])
def auth_sim():
    data = request.get_json()
    wallet_address = data.get('wallet_address')
    signature = data.get('signature') # In a real app, we'd verify this
    
    if wallet_address and signature:
        return jsonify({"status": "Authorized", "wallet": wallet_address}), 200
    return jsonify({"status": "Unauthorized"}), 401

# Simulation: Tamper with a block
@app.route('/tamper', methods=['POST'])
def tamper_chain():
    data = request.get_json()
    index = data.get('index')
    new_sensor_data = data.get('new_sensor_data')
    
    if index is not None and index < len(trust_chain.chain):
        trust_chain.chain[index].sensor_data = new_sensor_data
        return jsonify({"message": f"Block {index} tampered successfully!"}), 200
    return jsonify({"message": "Invalid block index"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
