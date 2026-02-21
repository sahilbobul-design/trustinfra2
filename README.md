# TrustInfra: IoT-Blockchain Prototype

A hackathon project for secure, tamper-proof IoT data ingestion.

## Overview
This system provides a lightweight blockchain implementation to secure sensor data from devices like ESP32. It focuses on two main security pillars:
1. **Anti-Tampering**: Using cryptographic hashing (SHA-256) to ensure data integrity.
2. **Anti-Cloning**: Using unique Entry IDs (UUIDs) to prevent data duplication and replay attacks.

## Structure
- `app.py`: Flask API for data ingestion and verification.
- `blockchain.py`: Core blockchain and validation logic.
- `verify_system.py`: Automated test for data entry and anti-cloning.
- `verify_tampering.py`: Automated test for tampering detection.
- `requirements.txt`: Python dependencies.

## Setup Instructions

1. **Clone/Copy Project Folder**
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the Server**:
   ```bash
   python app.py
   ```
   The API will be available at `http://localhost:5000`.

## API Documentation

- `POST /add-data`: Ingest sensor data.
  ```json
  {
    "sensor_data": {"temp": 25, "moisture": 40},
    "entry_id": "unique-uuid-here"
  }
  ```
- `GET /chain`: Retrieve the full blockchain.
- `GET /validate`: Check the integrity of the blockchain.
- `GET /logs`: View suspicious activity alerts.
- `POST /tamper`: (Debug Only) Simulator to manually modify a block's data.

## Hackathon Goal
Demonstrate how low-cost IoT devices can leverage blockchain concepts to ensure that data received at the backend is authentic and hasn't been modified or cloned by a malicious actor.
