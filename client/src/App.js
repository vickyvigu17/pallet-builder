import React, { useState, useEffect } from 'react';
import { Package, Truck, AlertTriangle, CheckCircle, Plus, Trash2, BarChart3, MapPin, Calendar, Activity } from 'lucide-react';
import axios from 'axios';
import CytoscapeComponent from 'react-cytoscapejs';

function App() {
  const [graphElements, setGraphElements] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [stats, setStats] = useState(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');

  useEffect(() => {
    // Detect if device is mobile/tablet
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchGraph = async () => {
      setGraphLoading(true);
      try {
        const [nodesRes, edgesRes, statsRes] = await Promise.all([
          axios.get(`${apiUrl}/api/nodes`),
          axios.get(`${apiUrl}/api/edges`),
          axios.get(`${apiUrl}/api/stats`),
        ]);
        
        const nodes = nodesRes.data.map(node => ({
          data: { id: node.id, label: node.type, ...node.properties, type: node.type },
          classes: node.type.toLowerCase(),
        }));
        
        const edges = edgesRes.data.map(edge => ({
          data: { source: edge.source, target: edge.target, label: edge.type, ...edge.properties, type: edge.type },
          classes: edge.type.toLowerCase(),
        }));
        
        setGraphElements([...nodes, ...edges]);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Error fetching graph data:', err);
        setGraphElements([]);
      }
      setGraphLoading(false);
    };
    fetchGraph();
  }, [apiUrl]);

  // --- Cytoscape event handler ---
  const cyCallback = (cy) => {
    cy.on('tap', 'node', (evt) => {
      setSelectedElement({ type: 'node', data: evt.target.data() });
    });
    cy.on('tap', 'edge', (evt) => {
      setSelectedElement({ type: 'edge', data: evt.target.data() });
    });
    cy.on('tap', (evt) => {
      if (evt.target === cy) setSelectedElement(null);
    });
  };

  // --- Detail Panel ---
  const renderDetailPanel = () => {
    if (!selectedElement) return null;
    const { type, data } = selectedElement;
    
    return (
      <div
        style={{
          position: isMobile ? 'fixed' : 'absolute',
          bottom: isMobile ? 0 : 'auto',
          right: isMobile ? 0 : 16,
          left: isMobile ? 0 : 'auto',
          top: isMobile ? 'auto' : 80,
          width: isMobile ? '100%' : 340,
          maxHeight: isMobile ? '40vh' : 400,
          background: '#fff',
          borderTopLeftRadius: isMobile ? 16 : 8,
          borderTopRightRadius: isMobile ? 16 : 8,
          borderRadius: isMobile ? 16 : 8,
          boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          zIndex: 100,
          padding: 20,
          overflowY: 'auto',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <strong style={{ fontSize: 18, color: '#1f2937' }}>
            {type === 'node' ? data.label : data.label + ' (Edge)'}
          </strong>
          <button 
            onClick={() => setSelectedElement(null)} 
            style={{ 
              fontSize: 20, 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ fontSize: 14, color: '#374151' }}>
          {Object.entries(data).map(([k, v]) => (
            k !== 'label' && k !== 'id' && k !== 'source' && k !== 'target' && k !== 'type' ? (
              <div key={k} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500, color: '#6b7280' }}>{k}:</span> 
                <span style={{ color: '#1f2937' }}>{String(v)}</span>
              </div>
            ) : null
          ))}
        </div>
        
        {type === 'edge' && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
            <div style={{ marginBottom: 4 }}>From: <b style={{ color: '#1f2937' }}>{data.source}</b></div>
            <div>To: <b style={{ color: '#1f2937' }}>{data.target}</b></div>
          </div>
        )}
      </div>
    );
  };

  // --- Stats Panel ---
  const renderStats = () => {
    if (!stats) return null;
    
    return (
      <div style={{ 
        background: 'white', 
        borderRadius: 8, 
        padding: 16, 
        margin: '16px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16
      }}>
        <div style={{ textAlign: 'center' }}>
          <BarChart3 size={24} color="#3b82f6" />
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>{stats.total_nodes}</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Total Nodes</div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <Activity size={24} color="#10b981" />
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>{stats.total_edges}</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Total Edges</div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <Package size={24} color="#f59e0b" />
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>
            {Object.keys(stats.node_types || {}).length}
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Node Types</div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <Truck size={24} color="#ef4444" />
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>
            {Object.keys(stats.edge_types || {}).length}
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Edge Types</div>
        </div>
      </div>
    );
  };

  return (
    <div className="App" style={{ position: 'relative' }}>
      {/* Header */}
      <header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? '24px' : '32px', fontWeight: 600 }}>
          🏭 Supply Chain Digital Twin
        </h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: isMobile ? '14px' : '16px' }}>
          Ontology-based graph model for retail supply chain management
        </p>
      </header>

      {/* API URL Input */}
      <div style={{ 
        background: 'white', 
        padding: '12px 16px', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>API URL:</label>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
          placeholder="http://localhost:8000"
        />
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Stats Panel */}
      {renderStats()}

      {/* Graph Visualization */}
      <div style={{ 
        height: isMobile ? '400px' : '500px', 
        margin: '16px', 
        background: '#f8fafc', 
        borderRadius: 8, 
        border: '1px solid #e5e7eb', 
        padding: 8, 
        position: 'relative' 
      }}>
        <h2 style={{ 
          margin: 0, 
          padding: '8px 16px', 
          fontWeight: 600, 
          color: '#1f2937',
          fontSize: isMobile ? '18px' : '20px'
        }}>
          Supply Chain Graph Visualization
        </h2>
        
        {graphLoading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: 'calc(100% - 60px)',
            color: '#6b7280'
          }}>
            Loading supply chain data...
          </div>
        ) : (
          <CytoscapeComponent
            elements={graphElements}
            style={{ width: '100%', height: 'calc(100% - 60px)' }}
            layout={{ 
              name: 'cose', 
              animate: true,
              nodeDimensionsIncludeLabels: true,
              fit: true
            }}
            cy={cyCallback}
            stylesheet={[
              {
                selector: 'node',
                style: {
                  label: 'data(label)',
                  'background-color': '#60a5fa',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'color': '#1f2937',
                  'font-size': 10,
                  'font-weight': 'bold',
                  'width': 35,
                  'height': 35,
                  'border-width': 2,
                  'border-color': '#ffffff',
                  'text-background-color': '#ffffff',
                  'text-background-opacity': 0.8,
                  'text-background-padding': 3,
                },
              },
              {
                selector: 'edge',
                style: {
                  width: 2,
                  'line-color': '#9ca3af',
                  'target-arrow-color': '#9ca3af',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                  label: 'data(label)',
                  'font-size': 8,
                  'text-background-color': '#ffffff',
                  'text-background-opacity': 0.9,
                  'text-background-padding': 2,
                  'text-rotation': 'autorotate',
                },
              },
              // Color by type
              { selector: '.distributioncenter', style: { 'background-color': '#f59e0b' } },
              { selector: '.store', style: { 'background-color': '#10b981' } },
              { selector: '.sku', style: { 'background-color': '#8b5cf6' } },
              { selector: '.truck', style: { 'background-color': '#ef4444' } },
              { selector: '.purchaseorder', style: { 'background-color': '#f59e0b' } },
              { selector: '.shipment', style: { 'background-color': '#06b6d4' } },
              { selector: '.inventorysnapshot', style: { 'background-color': '#84cc16' } },
              { selector: '.return', style: { 'background-color': '#ec4899' } },
              { selector: '.weatheralert', style: { 'background-color': '#fbbf24' } },
              { selector: '.event', style: { 'background-color': '#64748b' } },
            ]}
          />
        )}
        {renderDetailPanel()}
      </div>

      {/* Legend */}
      <div style={{ 
        background: 'white', 
        margin: '16px', 
        padding: '16px', 
        borderRadius: 8, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1f2937' }}>Node Types</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', 
          gap: '8px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 12, height: 12, backgroundColor: '#f59e0b', borderRadius: '50%' }}></div>
            <span>Distribution Center</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 12, height: 12, backgroundColor: '#10b981', borderRadius: '50%' }}></div>
            <span>Store</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 12, height: 12, backgroundColor: '#8b5cf6', borderRadius: '50%' }}></div>
            <span>SKU</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 12, height: 12, backgroundColor: '#ef4444', borderRadius: '50%' }}></div>
            <span>Truck</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 12, height: 12, backgroundColor: '#06b6d4', borderRadius: '50%' }}></div>
            <span>Shipment</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
