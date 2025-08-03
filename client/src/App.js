import React, { useState } from 'react';
import { Package, Truck, AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';

function App() {
  const [orderLines, setOrderLines] = useState([
    {
      id: 1,
      sku: 'SKU001',
      name: 'Cereal Boxes',
      store: 'Store A',
      quantity: 24,
      weight: 0.5,
      category: 'dry goods',
      fragile: false,
      height: 0.25,
      unitsPerCase: 12,
      casesPerLayer: 6
    }
  ]);
  const [pallets, setPallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [llmInsights, setLlmInsights] = useState(null);
  const [originalOrderLines, setOriginalOrderLines] = useState([]);
  const [implementationLoading, setImplementationLoading] = useState(false);
  const [implementationLog, setImplementationLog] = useState([]);

  const addOrderLine = () => {
    const newId = Math.max(...orderLines.map(ol => ol.id), 0) + 1;
    setOrderLines([...orderLines, {
      id: newId,
      sku: '',
      name: '',
      store: '',
      quantity: 1,
      weight: 1,
      category: 'dry goods',
      fragile: false,
      height: 0.3,
      unitsPerCase: 1,
      casesPerLayer: 1
    }]);
  };

  const removeOrderLine = (id) => {
    setOrderLines(orderLines.filter(ol => ol.id !== id));
  };

  const updateOrderLine = (id, field, value) => {
    setOrderLines(orderLines.map(ol => 
      ol.id === id 
        ? { ...ol, [field]: field === 'quantity' || field === 'weight' || field === 'height' || field === 'unitsPerCase' || field === 'casesPerLayer' ? Number(value) : value }
        : ol
    ));
  };

  const buildPallets = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    // Clean and validate order lines
    const validOrderLines = orderLines
      .filter(ol => ol.sku && ol.name && ol.store)
      .map(ol => ({
        ...ol,
        unitsPerCase: ol.unitsPerCase || 1,
        casesPerLayer: ol.casesPerLayer || 1,
        quantity: ol.quantity || 1,
        weight: ol.weight || 1,
        height: ol.height || 0.3
      }));
    
    // Store original order lines for implementation
    setOriginalOrderLines(validOrderLines);
    
    console.log('Valid order lines:', validOrderLines);
    
    try {
      const response = await axios.post('/api/build-pallets', {
        orderLines: validOrderLines
      });
      
      console.log('API Response:', response.data);
      console.log('LLM Insights:', response.data.llmInsights);
      console.log('Implementable Actions:', response.data.llmInsights?.implementableActions);
      setPallets(response.data.pallets);
      setLlmInsights(response.data.llmInsights);
      setImplementationLog([]); // Clear previous implementation log
      
      // Calculate summary from pallets
      const storeSet = {};
      for (let i = 0; i < response.data.pallets.length; i++) {
        storeSet[response.data.pallets[i].store] = true;
      }
      const uniqueStores = Object.keys(storeSet).length;
      
      let totalWeight = 0;
      for (let i = 0; i < response.data.pallets.length; i++) {
        totalWeight += response.data.pallets[i].totalWeight;
      }
      
      setSummary({
        totalPallets: response.data.pallets.length,
        stores: uniqueStores,
        totalWeight: totalWeight
      });
    } catch (error) {
      console.error('Error building pallets:', error);
      console.error('Error details:', error.response?.data);
      alert('Error building pallets. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const implementRecommendations = async () => {
    if (!llmInsights?.implementableActions || llmInsights.implementableActions.length === 0) {
      alert('No implementable recommendations available.');
      return;
    }

    setImplementationLoading(true);
    
    try {
      const response = await axios.post('/api/implement-recommendations', {
        pallets: pallets,
        orderLines: originalOrderLines,
        implementableActions: llmInsights.implementableActions
      });

      console.log('Implementation Response:', response.data);
      
      if (response.data.success) {
        // Update pallets with optimized version
        setPallets(response.data.optimizedPallets);
        setLlmInsights(response.data.newLlmInsights);
        setImplementationLog(response.data.implementationLog);
        
        // Update summary
        const storeSet = {};
        for (let i = 0; i < response.data.optimizedPallets.length; i++) {
          storeSet[response.data.optimizedPallets[i].store] = true;
        }
        const uniqueStores = Object.keys(storeSet).length;
        
        let totalWeight = 0;
        for (let i = 0; i < response.data.optimizedPallets.length; i++) {
          totalWeight += response.data.optimizedPallets[i].totalWeight;
        }
        
        setSummary({
          totalPallets: response.data.optimizedPallets.length,
          stores: uniqueStores,
          totalWeight: totalWeight
        });

        alert(`✅ Recommendations implemented successfully!\n\nPallet reduction: ${response.data.savings.originalCount} → ${response.data.savings.optimizedCount} pallets\nSavings: ${response.data.savings.palletReduction} pallets`);
      }
    } catch (error) {
      console.error('Error implementing recommendations:', error);
      alert('Error implementing recommendations. Please try again.');
    } finally {
      setImplementationLoading(false);
    }
  };

  const loadSampleData = () => {
    setOrderLines([
      {
        id: 1,
        sku: 'SKU001',
        name: 'Cereal Boxes',
        store: 'Store A',
        quantity: 48,
        weight: 0.5,
        category: 'dry goods',
        fragile: false,
        height: 0.25,
        unitsPerCase: 12,
        casesPerLayer: 8
      },
      {
        id: 2,
        sku: 'SKU002',
        name: 'Frozen Pizza',
        store: 'Store A',
        quantity: 30,
        weight: 1.2,
        category: 'frozen',
        fragile: false,
        height: 0.05,
        unitsPerCase: 6,
        casesPerLayer: 4
      },
      {
        id: 3,
        sku: 'SKU003',
        name: 'Glass Bottles',
        store: 'Store B',
        quantity: 24,
        weight: 2.0,
        category: 'bottles',
        fragile: true,
        height: 0.3,
        unitsPerCase: 24,
        casesPerLayer: 3
      },
      {
        id: 4,
        sku: 'SKU004',
        name: 'Canned Goods',
        store: 'Store A',
        quantity: 60,
        weight: 0.8,
        category: 'dry goods',
        fragile: false,
        height: 0.15,
        unitsPerCase: 24,
        casesPerLayer: 6
      },
      {
        id: 5,
        sku: 'SKU005',
        name: 'Ice Cream',
        store: 'Store B',
        quantity: 20,
        weight: 1.5,
        category: 'frozen',
        fragile: false,
        height: 0.12,
        unitsPerCase: 4,
        casesPerLayer: 5
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-warehouse-50">
      {/* Header */}
      <header className="bg-warehouse-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-primary-400" />
            <h1 className="text-3xl font-bold">Pallet Builder</h1>
            <span className="text-warehouse-400">Distribution Center Optimization</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Input Section */}
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-warehouse-900">Order Lines</h2>
                <div className="space-x-2">
                  <button onClick={loadSampleData} className="btn-secondary text-sm">
                    Load Sample
                  </button>
                  <button onClick={addOrderLine} className="btn-primary">
                    <Plus className="h-4 w-4 inline mr-1" />
                    Add Item
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {orderLines.map((orderLine) => (
                  <div key={orderLine.id} className="border border-warehouse-200 rounded-lg p-4 bg-warehouse-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">SKU</label>
                        <input
                          type="text"
                          value={orderLine.sku}
                          onChange={(e) => updateOrderLine(orderLine.id, 'sku', e.target.value)}
                          className="input-field"
                          placeholder="SKU001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Product Name</label>
                        <input
                          type="text"
                          value={orderLine.name}
                          onChange={(e) => updateOrderLine(orderLine.id, 'name', e.target.value)}
                          className="input-field"
                          placeholder="Product name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Store</label>
                        <input
                          type="text"
                          value={orderLine.store}
                          onChange={(e) => updateOrderLine(orderLine.id, 'store', e.target.value)}
                          className="input-field"
                          placeholder="Store A"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={orderLine.quantity}
                          onChange={(e) => updateOrderLine(orderLine.id, 'quantity', e.target.value)}
                          className="input-field"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={orderLine.weight}
                          onChange={(e) => updateOrderLine(orderLine.id, 'weight', e.target.value)}
                          className="input-field"
                          min="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Items per Case</label>
                        <input
                          type="number"
                          value={orderLine.unitsPerCase}
                          onChange={(e) => updateOrderLine(orderLine.id, 'unitsPerCase', e.target.value)}
                          className="input-field"
                          min="1"
                          placeholder="e.g., 12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Cases per Layer</label>
                        <input
                          type="number"
                          value={orderLine.casesPerLayer}
                          onChange={(e) => updateOrderLine(orderLine.id, 'casesPerLayer', e.target.value)}
                          className="input-field"
                          min="1"
                          placeholder="e.g., 6"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Category</label>
                        <select
                          value={orderLine.category}
                          onChange={(e) => updateOrderLine(orderLine.id, 'category', e.target.value)}
                          className="input-field"
                        >
                          <option value="dry goods">Dry Goods</option>
                          <option value="frozen">Frozen</option>
                          <option value="bottles">Bottles</option>
                          <option value="fragile">Fragile</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={orderLine.fragile}
                          onChange={(e) => updateOrderLine(orderLine.id, 'fragile', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-warehouse-700">Fragile</span>
                      </label>
                      <button
                        onClick={() => removeOrderLine(orderLine.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    buildPallets(e);
                  }}
                  disabled={loading || orderLines.length === 0}
                  className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Building Pallets...' : 'Build Pallets'}
                  <Truck className="h-5 w-5 inline ml-2" />
                </button>
              </div>
            </div>
          </div>

          {/* Pallet Results Section */}
          <div className="space-y-6">
            {/* LLM Insights Section */}
            {llmInsights && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-warehouse-900 flex items-center">
                    🤖 AI Optimization Insights
                  </h3>
                  {(llmInsights.implementableActions && llmInsights.implementableActions.length > 0) || true && (
                    <div className="flex flex-col space-y-2">
                      {/* Debug Info */}
                      <div className="text-xs text-gray-500">
                        Debug: {llmInsights.implementableActions ? `${llmInsights.implementableActions.length} actions available` : 'No implementableActions found'}
                      </div>
                      
                      <button
                        onClick={implementRecommendations}
                        disabled={implementationLoading || (!llmInsights.implementableActions || llmInsights.implementableActions.length === 0)}
                        className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                      >
                        {implementationLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Implementing...</span>
                          </>
                        ) : (
                          <>
                            <span>🚀 Implement Recommendations</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Implementation Log */}
                {implementationLog && implementationLog.length > 0 && (
                  <div className="card bg-green-50 border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">🎯 Implementation Results</h4>
                    <div className="space-y-1">
                      {implementationLog.map((log, idx) => (
                        <div key={idx} className="text-green-700 text-sm">• {log}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Cost Savings */}
                <div className="card bg-green-50 border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">💰 Cost Analysis</h4>
                  <p className="text-green-700">{llmInsights.costSavings}</p>
                </div>

                {/* Safety Warnings */}
                {llmInsights.safetyWarnings && llmInsights.safetyWarnings.length > 0 && (
                  <div className="card bg-red-50 border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">⚠️ Safety Warnings</h4>
                    <div className="space-y-1">
                      {llmInsights.safetyWarnings.map((warning, idx) => (
                        <div key={idx} className="text-red-700 text-sm">• {warning}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loose Item Strategy */}
                {llmInsights.looseItemStrategy && (
                  <div className="card bg-blue-50 border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">📦 Loose Item Management</h4>
                    <p className="text-blue-700 text-sm">{llmInsights.looseItemStrategy}</p>
                  </div>
                )}

                {/* Recommendations */}
                {llmInsights.recommendations && llmInsights.recommendations.length > 0 && (
                  <div className="card bg-yellow-50 border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2">💡 AI Recommendations</h4>
                    <div className="space-y-1">
                      {llmInsights.recommendations.map((rec, idx) => (
                        <div key={idx} className="text-yellow-700 text-sm">• {rec}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Analysis */}
                {llmInsights.analysis && (
                  <div className="card">
                    <h4 className="font-semibold text-warehouse-900 mb-2">📊 Detailed Analysis</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary-600">{llmInsights.analysis.totalPallets}</div>
                        <div className="text-warehouse-600">Total Pallets</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary-600">{llmInsights.analysis.averageUtilization?.toFixed(1)}%</div>
                        <div className="text-warehouse-600">Avg Utilization</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary-600">{llmInsights.analysis.looseItems?.length || 0}</div>
                        <div className="text-warehouse-600">Loose Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary-600">{llmInsights.analysis.fragileItems?.length || 0}</div>
                        <div className="text-warehouse-600">Fragile Items</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {summary && (
              <div className="card">
                <h3 className="text-lg font-semibold text-warehouse-900 mb-3">Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{summary.totalPallets}</div>
                    <div className="text-sm text-warehouse-600">Total Pallets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{summary.stores}</div>
                    <div className="text-sm text-warehouse-600">Stores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{Math.round(summary.totalWeight)}kg</div>
                    <div className="text-sm text-warehouse-600">Total Weight</div>
                  </div>
                </div>
              </div>
            )}

            {pallets.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-warehouse-900">Generated Pallets</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {pallets.map((pallet, index) => (
                    <div key={pallet.id || pallet.palletId || index} className="card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-warehouse-900">
                          Pallet #{index + 1} - {pallet.store || 'Unknown Store'}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {pallet.type === 'frozen' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Frozen
                            </span>
                          )}
                          <span className="text-sm text-warehouse-600">
                            {Math.round(pallet.totalWeight || 0)}kg
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {(pallet.items || []).map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center justify-between py-2 border-b border-warehouse-100 last:border-b-0">
                            <div className="flex items-center space-x-2">
                              {item.fragile && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                              <span className="text-sm font-medium">{item.name || item.sku}</span>
                              <span className="text-xs text-warehouse-500">({item.sku})</span>
                            </div>
                            <div className="text-sm text-warehouse-600">
                              {item.quantity} × {Math.round((item.weight || 0) / (item.quantity || 1) * 10) / 10}kg
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {(pallet.specialInstructions || pallet.instructions || []).length > 0 && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="flex items-center space-x-1 mb-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">Special Instructions:</span>
                          </div>
                          {(pallet.specialInstructions || pallet.instructions || []).map((instruction, idx) => (
                            <div key={idx} className="text-sm text-yellow-700">• {instruction}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pallets.length === 0 && !loading && (
              <div className="card text-center py-12">
                <Package className="h-16 w-16 text-warehouse-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-warehouse-600 mb-2">No Pallets Generated</h3>
                <p className="text-warehouse-500">Add order lines and click "Build Pallets" to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
