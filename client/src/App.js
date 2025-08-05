import React, { useEffect, useState } from "react";
import axios from "axios";
import MapView from "./MapView";

function App() {
  const [dcs, setDcs] = useState([]);
  const [stores, setStores] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [highlight, setHighlight] = useState(null);

  // Use environment variable or default to current domain for single-service deployment
  const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;

  useEffect(() => {
    const fetchNodes = async () => {
      setLoading(true);
      try {
        console.log("Fetching from:", `${apiUrl}/api/nodes`);
        const res = await axios.get(`${apiUrl}/api/nodes`);
        console.log("API response:", res.data.length, "nodes received");
        setDcs(res.data.filter(n => n.type === "DistributionCenter"));
        setStores(res.data.filter(n => n.type === "Store"));
        setTrucks(res.data.filter(n => n.type === "Truck"));
        setPurchaseOrders(res.data.filter(n => n.type === "PurchaseOrder"));
        setShipments(res.data.filter(n => n.type === "Shipment"));
      } catch (err) {
        console.error("Error fetching data:", err);
        console.error("API URL used:", apiUrl);
        setDcs([]);
        setStores([]);
        setTrucks([]);
        setPurchaseOrders([]);
        setShipments([]);
      }
      setLoading(false);
    };
    fetchNodes();
  }, [apiUrl]);

  // Handle filtering
  useEffect(() => {
    if (selectedPO) {
      setHighlight({ id: selectedPO, type: "PO" });
    } else if (selectedTruck) {
      setHighlight({ id: selectedTruck, type: "Truck" });
    } else {
      setHighlight(null);
    }
  }, [selectedPO, selectedTruck]);

  return (
    <div>
      <header style={{ background: "#2563eb", color: "white", padding: 20, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>
          🏭 Supply Chain Digital Twin
        </h1>
        <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: 16 }}>
          US Map Visualization of Distribution Centers and Stores
        </p>
      </header>

      {/* Filter Controls */}
      <div style={{ 
        background: "white", 
        padding: "16px", 
        margin: "16px", 
        borderRadius: "8px", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        display: "flex",
        gap: "16px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontWeight: 500, fontSize: 14 }}>Purchase Order:</label>
          <select 
            value={selectedPO} 
            onChange={(e) => setSelectedPO(e.target.value)}
            style={{ 
              padding: "8px 12px", 
              border: "1px solid #d1d5db", 
              borderRadius: "4px",
              fontSize: "14px"
            }}
          >
            <option value="">All POs</option>
            {purchaseOrders.map(po => (
              <option key={po.id} value={po.id}>{po.id} - {po.properties?.status || "Unknown"}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontWeight: 500, fontSize: 14 }}>Transport ID:</label>
          <select 
            value={selectedTruck} 
            onChange={(e) => setSelectedTruck(e.target.value)}
            style={{ 
              padding: "8px 12px", 
              border: "1px solid #d1d5db", 
              borderRadius: "4px",
              fontSize: "14px"
            }}
          >
            <option value="">All Trucks</option>
            {trucks.map(truck => (
              <option key={truck.id} value={truck.id}>{truck.id} - {truck.properties?.status || "Unknown"}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => {
            setSelectedPO("");
            setSelectedTruck("");
            setHighlight(null);
          }}
          style={{
            padding: "8px 16px",
            background: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Stats */}
      <div style={{ 
        background: "white", 
        padding: "16px", 
        margin: "16px", 
        borderRadius: "8px", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "16px"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#2563eb" }}>{dcs.length}</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>Distribution Centers</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981" }}>{stores.length}</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>Stores</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#f59e0b" }}>{trucks.length}</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>Trucks</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#8b5cf6" }}>{purchaseOrders.length}</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>Purchase Orders</div>
        </div>
      </div>

      <div style={{ margin: 24 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
            Loading map...
          </div>
        ) : (
          <MapView dcs={dcs} stores={stores} shipments={shipments} highlight={highlight} />
        )}
      </div>

      {/* Legend */}
      <div style={{ 
        background: "white", 
        margin: "16px", 
        padding: "16px", 
        borderRadius: "8px", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#1f2937" }}>Map Legend</h3>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "12px",
          fontSize: "14px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 14, height: 14, backgroundColor: "#2563eb", borderRadius: "50%", border: "2px solid white" }}></div>
            <span>Distribution Centers</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 10, height: 10, backgroundColor: "#34d399", borderRadius: "50%", border: "1.5px solid white" }}></div>
            <span>Stores</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 14, height: 14, backgroundColor: "#f59e0b", borderRadius: "50%", border: "2px solid white" }}></div>
            <span>Highlighted (Selected)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
