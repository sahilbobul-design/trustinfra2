import hashlib
import json
import time
import uuid

class Block:
    def __init__(self, index, timestamp, sensor_data, previous_hash, entry_id):
        self.index = index
        self.timestamp = timestamp
        self.sensor_data = sensor_data
        self.previous_hash = previous_hash
        self.entry_id = entry_id  # UUID for Anti-Cloning
        self.hash = self.calculate_hash()

    def calculate_hash(self):
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "sensor_data": self.sensor_data,
            "previous_hash": self.previous_hash,
            "entry_id": self.entry_id
        }, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

class Blockchain:
    def __init__(self):
        self.chain = []
        self.entry_ids = set() # For fast Anti-Cloning check
        self.create_genesis_block()

    def create_genesis_block(self):
        genesis_entry_id = str(uuid.uuid4())
        genesis_block = Block(0, time.time(), "Genesis Block", "0", genesis_entry_id)
        self.chain.append(genesis_block)
        self.entry_ids.add(genesis_entry_id)

    def get_latest_block(self):
        return self.chain[-1]

    def add_block(self, sensor_data, entry_id):
        # Anti-Cloning Check
        if entry_id in self.entry_ids:
            return False, "Duplicate entry detected (Anti-Cloning)"
        
        new_block = Block(
            len(self.chain),
            time.time(),
            sensor_data,
            self.get_latest_block().hash,
            entry_id
        )
        self.chain.append(new_block)
        self.entry_ids.add(entry_id)
        return True, "Block added successfully"

    def is_chain_valid(self):
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i-1]

            # Re-calculate hash to check for tampering
            if current_block.hash != current_block.calculate_hash():
                return False, f"Tampering detected at block {i}: Hash mismatch"

            # Check if current block points to previous block correctly
            if current_block.previous_hash != previous_block.hash:
                return False, f"Tampering detected at block {i}: Link mismatch"
        
        return True, "Blockchain integrity verified"

    def get_chain(self):
        chain_data = []
        for block in self.chain:
            chain_data.append(block.__dict__)
        return chain_data
