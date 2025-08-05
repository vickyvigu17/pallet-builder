#!/usr/bin/env python3
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_api_directly():
    print("Testing API endpoints directly...")
    
    # Test debug endpoint
    print("\nTesting /debug/static...")
    response = client.get("/debug/static")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Response:", response.json())
    else:
        print("Error:", response.text)
    
    # Test API nodes
    print("\nTesting /api/nodes...")
    response = client.get("/api/nodes")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Received {len(data)} nodes")
        if data:
            print("Sample node:", data[0])
    else:
        print("Error:", response.text)
    
    # Test API stats
    print("\nTesting /api/stats...")
    response = client.get("/api/stats")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Response:", response.json())
    else:
        print("Error:", response.text)

if __name__ == "__main__":
    test_api_directly()