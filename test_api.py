#!/usr/bin/env python3
import requests
import json

def test_api():
    base_url = "http://localhost:8000"
    
    # Test debug endpoint
    print("Testing /debug/static...")
    try:
        response = requests.get(f"{base_url}/debug/static")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.text)
    except Exception as e:
        print(f"Error: {e}")
    
    print("\nTesting /api/nodes...")
    try:
        response = requests.get(f"{base_url}/api/nodes")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Received {len(data)} nodes")
            if data:
                print("Sample node:", json.dumps(data[0], indent=2))
        else:
            print("Error:", response.text)
    except Exception as e:
        print(f"Error: {e}")
    
    print("\nTesting /api/stats...")
    try:
        response = requests.get(f"{base_url}/api/stats")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()