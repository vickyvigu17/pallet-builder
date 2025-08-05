from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import networkx as nx
import random
from datetime import datetime, timedelta
import os

app = FastAPI(title="Supply Chain Digital Twin API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (React build)
app.mount("/static", StaticFiles(directory="static/static", check_dir=False), name="static")

# Serve React app at root
@app.get("/")
async def serve_frontend():
    try:
        return FileResponse("static/index.html")
    except Exception as e:
        return {"error": f"Frontend not found: {str(e)}"}

# Debug endpoint
@app.get("/debug/static")
async def debug_static():
    try:
        result = {"static_exists": False}
        
        if os.path.exists("static"):
            result["static_exists"] = True
            result["static_files"] = os.listdir("static")
            
            if os.path.exists("static/static"):
                result["static_static_files"] = os.listdir("static/static")
                
                if os.path.exists("static/static/css"):
                    result["css_files"] = os.listdir("static/static/css")
                    
                if os.path.exists("static/static/js"):
                    result["js_files"] = os.listdir("static/static/js")
        
        return result
    except Exception as e:
        return {"error": str(e)}

# --- Graph Model ---
G = nx.MultiDiGraph()

# --- Helper Functions for Sample Data ---
def random_location():
    cities = ["Cincinnati, OH", "Dallas, TX", "Atlanta, GA", "Denver, CO", "Chicago, IL", 
              "Phoenix, AZ", "Seattle, WA", "Orlando, FL", "Nashville, TN", "Salt Lake City, UT"]
    return random.choice(cities)

def random_region():
    return random.choice(["Midwest", "South", "West", "Northeast"])

def random_store_type():
    return random.choice(["urban", "rural"])

def random_category():
    return random.choice(["Frozen", "Fragile", "Dry Goods", "Produce", "Beverages", "Snacks"])

def random_temp_zone():
    return random.choice(["Frozen", "Ambient", "Fragile"])

def random_status(options):
    return random.choice(options)

def random_date(start_days_ago=30, end_days_ago=0):
    start = datetime.now() - timedelta(days=start_days_ago)
    end = datetime.now() - timedelta(days=end_days_ago)
    return (start + (end - start) * random.random()).strftime("%Y-%m-%d")

def random_time_window():
    start = datetime.now() + timedelta(days=random.randint(0, 5))
    end = start + timedelta(hours=random.randint(2, 24))
    return start.strftime("%Y-%m-%dT%H:%M"), end.strftime("%Y-%m-%dT%H:%M")

def random_condition():
    return random.choice(["Good", "Damaged", "Expired"])

def random_event_type():
    return random.choice(["Delay", "Shortage", "Rejection"])

def random_weather_type():
    return random.choice(["Storm", "Heatwave", "Flood"])

def random_severity():
    return random.choice(["Low", "Medium", "High"])

# --- Sample Data Generation ---
def generate_sample_data():
    # Distribution Centers
    dcs = []
    for i in range(16):
        dc = {
            "type": "DistributionCenter",
            "dc_id": f"DC{i+1:03}",
            "name": f"DC {i+1}",
            "location": random_location(),
            "region": random_region(),
        }
        dcs.append(dc)
        G.add_node(dc["dc_id"], **dc)

    # Stores
    stores = []
    for i in range(200):
        store = {
            "type": "Store",
            "store_id": f"S{i+1:04}",
            "name": f"Store {i+1}",
            "location": random_location(),
            "region": random_region(),
            "type": random_store_type(),
        }
        stores.append(store)
        G.add_node(store["store_id"], **store)

    # SKUs
    skus = []
    for i in range(500):
        sku = {
            "type": "SKU",
            "sku_id": f"SKU{i+1:05}",
            "name": f"Product {i+1}",
            "category": random_category(),
            "unit": random.choice(["case", "each", "pallet"]),
            "temperature_zone": random_temp_zone(),
        }
        skus.append(sku)
        G.add_node(sku["sku_id"], **sku)

    # Trucks
    trucks = []
    for i in range(40):
        truck = {
            "type": "Truck",
            "truck_id": f"T{i+1:03}",
            "carrier": random.choice(["FedEx", "UPS", "XPO", "JB Hunt", "Ryder"]),
            "route_id": f"R{i+1:03}",
            "status": random_status(["In Transit", "Delayed", "Idle"]),
            "current_location": random_location(),
        }
        trucks.append(truck)
        G.add_node(truck["truck_id"], **truck)

    # Purchase Orders
    pos = []
    for i in range(60):
        po = {
            "type": "PurchaseOrder",
            "po_id": f"PO{i+1:04}",
            "date": random_date(),
            "status": random_status(["Open", "In Progress", "Delivered"]),
            "delivery_window_start": random_time_window()[0],
            "delivery_window_end": random_time_window()[1],
        }
        pos.append(po)
        G.add_node(po["po_id"], **po)

    # Shipments
    shipments = []
    for i in range(15):
        shipment = {
            "type": "Shipment",
            "shipment_id": f"SH{i+1:03}",
            "carrier": random.choice(["FedEx", "UPS", "XPO", "JB Hunt", "Ryder"]),
            "mode": random.choice(["FTL", "LTL"]),
            "status": random_status(["In Transit", "Delayed", "Delivered"]),
            "eta": random_time_window()[1],
        }
        shipments.append(shipment)
        G.add_node(shipment["shipment_id"], **shipment)

    # Inventory Snapshots
    inv_snaps = []
    for i in range(12):
        snap = {
            "type": "InventorySnapshot",
            "snapshot_id": f"IS{i+1:03}",
            "sku_id": random.choice(skus)["sku_id"],
            "quantity_on_hand": random.randint(0, 500),
            "store_id": random.choice(stores)["store_id"],
            "timestamp": random_date(),
        }
        inv_snaps.append(snap)
        G.add_node(snap["snapshot_id"], **snap)

    # Returns
    returns = []
    for i in range(15):
        ret = {
            "type": "Return",
            "return_id": f"RET{i+1:03}",
            "reason": random.choice(["Damaged", "Expired", "Customer Return"]),
            "date": random_date(),
            "condition": random_condition(),
            "quantity": random.randint(1, 20),
        }
        returns.append(ret)
        G.add_node(ret["return_id"], **ret)

    # Weather Alerts
    alerts = []
    for i in range(10):
        alert = {
            "type": "WeatherAlert",
            "alert_id": f"WA{i+1:03}",
            "type": random_weather_type(),
            "region": random_region(),
            "severity": random_severity(),
            "date": random_date(),
        }
        alerts.append(alert)
        G.add_node(alert["alert_id"], **alert)

    # Events
    events = []
    for i in range(11):
        event = {
            "type": "Event",
            "event_id": f"EVT{i+1:03}",
            "type": random_event_type(),
            "impacted_entity": random.choice([random.choice(trucks)["truck_id"], random.choice(pos)["po_id"]]),
            "timestamp": random_date(),
            "resolution_status": random_status(["Open", "Resolved", "In Progress"]),
        }
        events.append(event)
        G.add_node(event["event_id"], **event)

    # --- Relationships ---
    # DC SUPPLIES Store
    for store in stores:
        dc = random.choice(dcs)
        G.add_edge(dc["dc_id"], store["store_id"], type="SUPPLIES")
    
    # DC SHIPS Truck
    for truck in trucks:
        dc = random.choice(dcs)
        G.add_edge(dc["dc_id"], truck["truck_id"], type="SHIPS")
    
    # Truck CARRIES Shipment
    for shipment in shipments:
        truck = random.choice(trucks)
        G.add_edge(truck["truck_id"], shipment["shipment_id"], type="CARRIES")
    
    # Shipment CONTAINS SKU
    for shipment in shipments:
        for _ in range(random.randint(2, 10)):
            sku = random.choice(skus)
            G.add_edge(shipment["shipment_id"], sku["sku_id"], type="CONTAINS")
    
    # Shipment DELIVERS Store
    for shipment in shipments:
        store = random.choice(stores)
        G.add_edge(shipment["shipment_id"], store["store_id"], type="DELIVERS")
    
    # Store ORDERS PurchaseOrder
    for po in pos:
        store = random.choice(stores)
        G.add_edge(store["store_id"], po["po_id"], type="ORDERS")
    
    # PurchaseOrder INCLUDES SKU
    for po in pos:
        for _ in range(random.randint(1, 5)):
            sku = random.choice(skus)
            G.add_edge(po["po_id"], sku["sku_id"], type="INCLUDES")
    
    # PurchaseOrder FULFILLED_BY Shipment
    for po in pos:
        shipment = random.choice(shipments)
        G.add_edge(po["po_id"], shipment["shipment_id"], type="FULFILLED_BY")
    
    # Store HAS_INVENTORY InventorySnapshot
    for snap in inv_snaps:
        store_id = snap["store_id"]
        G.add_edge(store_id, snap["snapshot_id"], type="HAS_INVENTORY")
    
    # Store PROCESSES Return
    for ret in returns:
        store = random.choice(stores)
        G.add_edge(store["store_id"], ret["return_id"], type="PROCESSES")
    
    # WeatherAlert IMPACTS DC
    for alert in alerts:
        dc = random.choice(dcs)
        G.add_edge(alert["alert_id"], dc["dc_id"], type="IMPACTS")
    
    # WeatherAlert IMPACTS Truck
    for alert in alerts:
        truck = random.choice(trucks)
        G.add_edge(alert["alert_id"], truck["truck_id"], type="IMPACTS")
    
    # Event ASSOCIATED_WITH Truck or PO
    for event in events:
        if event["impacted_entity"].startswith("T"):
            G.add_edge(event["event_id"], event["impacted_entity"], type="ASSOCIATED_WITH")
        else:
            G.add_edge(event["event_id"], event["impacted_entity"], type="ASSOCIATED_WITH")

# Generate sample data on startup
generate_sample_data()

# --- API Models ---
class NodeModel(BaseModel):
    id: str
    type: str
    properties: Dict[str, Any]

class EdgeModel(BaseModel):
    source: str
    target: str
    type: str
    properties: Optional[Dict[str, Any]] = None

# API endpoints
@app.get("/api/")
def read_root():
    return {"message": "Supply Chain Digital Twin API", "version": "1.0.0"}

@app.get("/api/nodes")
def get_nodes(type: Optional[str] = None):
    nodes = []
    for node_id, data in G.nodes(data=True):
        if type is None or data.get("type") == type:
            nodes.append(NodeModel(
                id=node_id, 
                type=data.get("type"), 
                properties={k: v for k, v in data.items() if k != "type"}
            ))
    return nodes

@app.get("/api/edges")
def get_edges(type: Optional[str] = None):
    edges = []
    for u, v, data in G.edges(data=True):
        if type is None or data.get("type") == type:
            edges.append(EdgeModel(
                source=u, 
                target=v, 
                type=data.get("type"), 
                properties={k: v for k, v in data.items() if k != "type"}
            ))
    return edges

@app.get("/api/node/{node_id}")
def get_node(node_id: str):
    if node_id not in G:
        raise HTTPException(status_code=404, detail="Node not found")
    data = G.nodes[node_id]
    return NodeModel(
        id=node_id, 
        type=data.get("type"), 
        properties={k: v for k, v in data.items() if k != "type"}
    )

@app.get("/api/neighbors/{node_id}")
def get_neighbors(node_id: str):
    if node_id not in G:
        raise HTTPException(status_code=404, detail="Node not found")
    neighbors = []
    for n in G.neighbors(node_id):
        data = G.nodes[n]
        neighbors.append(NodeModel(
            id=n, 
            type=data.get("type"), 
            properties={k: v for k, v in data.items() if k != "type"}
        ))
    return neighbors

@app.get("/api/stats")
def get_stats():
    return {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "node_types": {node_type: len([n for n, d in G.nodes(data=True) if d.get("type") == node_type]) 
                      for node_type in set(d.get("type") for _, d in G.nodes(data=True))},
        "edge_types": {edge_type: len([e for _, _, e in G.edges(data=True) if e.get("type") == edge_type]) 
                      for edge_type in set(e.get("type") for _, _, e in G.edges(data=True))}
    }

# Catch-all route
@app.get("/{full_path:path}")
async def serve_frontend_catch_all(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    try:
        return FileResponse("static/index.html")
    except Exception as e:
        return {"error": f"Frontend not found: {str(e)}"}