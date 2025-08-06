import React, { useState } from 'react';
import { Package, Truck, AlertTriangle, Plus, Trash2 } from 'lucide-react';
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
      unitsPerCase: 12,
      casesPerLayer: 6
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
    e.preventDefault();
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
        // Update pallets with optimized versions
        setPallets(response.data.updatedPallets);
        
        // Update implementation log
        setImplementationLog(response.data.implementationLog);
        
        // Update insights if new ones are provided
        if (response.data.newInsights) {
          setLlmInsights(response.data.newInsights);
        }
        
        // Update summary with new pallet counts
        const newPallets = response.data.updatedPallets;
        const storeSet = {};
        for (let i = 0; i < newPallets.length; i++) {
          storeSet[newPallets[i].store] = true;
        }
        const uniqueStores = Object.keys(storeSet).length;
        
        let totalWeight = 0;
        for (let i = 0; i < newPallets.length; i++) {
          totalWeight += newPallets[i].totalWeight;
        }
        
        setSummary({
          totalPallets: newPallets.length,
          stores: uniqueStores,
          totalWeight: totalWeight
        });

        alert(`🎉 Recommendations implemented successfully!\n\n${response.data.implementationLog.join('\n')}`);
      } else {
        alert('Failed to implement recommendations. Please try again.');
      }
    } catch (error) {
      console.error('Error implementing recommendations:', error);
      console.error('Error details:', error.response?.data);
      alert('Error implementing recommendations. Please check console for details.');
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
        name: 'Glass Bottles',
        store: 'Store A',
        quantity: 24,
        weight: 1.2,
        category: 'bottles',
        fragile: true,
        height: 0.3,
        unitsPerCase: 24,
        casesPerLayer: 3
      },
      {
        id: 3,
        sku: 'SKU003',
        name: 'Frozen Pizza',
        store: 'Store B',
        quantity: 30,
        weight: 0.8,
        category: 'frozen',
        fragile: false,
        height: 0.05,
        unitsPerCase: 6,
        casesPerLayer: 4
      },
      {
        id: 4,
        sku: 'SKU004',
        name: 'Electronics',
        store: 'Store A',
        quantity: 12,
        weight: 2.5,
        category: 'electronics',
        fragile: true,
        height: 0.15,
        unitsPerCase: 4,
        casesPerLayer: 2
      },
      {
        id: 5,
        sku: 'SKU005',
        name: 'Canned Goods',
        store: 'Store B',
        quantity: 60,
        weight: 0.4,
        category: 'dry goods',
        fragile: false,
        height: 0.12,
        unitsPerCase: 12,
        casesPerLayer: 5
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-warehouse-900 mb-4 flex items-center justify-center">
            <Package className="mr-3 text-primary-600" size={48} />
            Intelligent Pallet Builder
          </h1>
          <p className="text-lg text-warehouse-600">AI-Powered Warehouse Optimization System</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold text-warehouse-900 mb-4">Order Configuration</h2>
              
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={addOrderLine}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Add Item</span>
                </button>
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="btn-secondary"
                >
                  Load Sample Data
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {orderLines.map((line) => (
                  <div key={line.id} className="border border-warehouse-200 rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">SKU</label>
                        <input
                          type="text"
                          value={line.sku}
                          onChange={(e) => updateOrderLine(line.id, 'sku', e.target.value)}
                          className="input-field"
                          placeholder="SKU001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Product Name</label>
                        <input
                          type="text"
                          value={line.name}
                          onChange={(e) => updateOrderLine(line.id, 'name', e.target.value)}
                          className="input-field"
                          placeholder="Product name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Store</label>
                        <input
                          type="text"
                          value={line.store}
                          onChange={(e) => updateOrderLine(line.id, 'store', e.target.value)}
                          className="input-field"
                          placeholder="Store A"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateOrderLine(line.id, 'quantity', e.target.value)}
                          className="input-field"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          value={line.weight}
                          onChange={(e) => updateOrderLine(line.id, 'weight', e.target.value)}
                          className="input-field"
                          step="0.1"
                          min="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Height (m)</label>
                        <input
                          type="number"
                          value={line.height}
                          onChange={(e) => updateOrderLine(line.id, 'height', e.target.value)}
                          className="input-field"
                          step="0.01"
                          min="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Items per Case</label>
                        <input
                          type="number"
                          value={line.unitsPerCase}
                          onChange={(e) => updateOrderLine(line.id, 'unitsPerCase', e.target.value)}
                          className="input-field"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Cases per Layer</label>
                        <input
                          type="number"
                          value={line.casesPerLayer}
                          onChange={(e) => updateOrderLine(line.id, 'casesPerLayer', e.target.value)}
                          className="input-field"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-warehouse-700 mb-1">Category</label>
                        <select
                          value={line.category}
                          onChange={(e) => updateOrderLine(line.id, 'category', e.target.value)}
                          className="input-field"
                        >
                          <option value="dry goods">Dry Goods</option>
                          <option value="frozen">Frozen</option>
                          <option value="bottles">Bottles</option>
                          <option value="electronics">Electronics</option>
                          <option value="fragile">Fragile</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={line.fragile}
                            onChange={(e) => updateOrderLine(line.id, 'fragile', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-warehouse-700">Fragile</span>
                        </label>
                      </div>
                      <div className="flex justify-end items-end">
                        <button
                          type="button"
                          onClick={() => removeOrderLine(line.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={buildPallets}
                disabled={loading || orderLines.length === 0}
                className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Building Pallets...</span>
                  </>
                ) : (
                  <>
                    <Truck size={20} />
                    <span>Build Pallets</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* LLM Insights Section */}
            {llmInsights && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-warehouse-900 flex items-center">
                    🤖 AI Optimization Insights
                  </h3>
                  {((llmInsights.implementableActions && llmInsights.implementableActions.length > 0) || true) && (
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
                {llmInsights.costSavings && (
                  <div className="card bg-green-50 border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">💰 Cost Analysis</h4>
                    <p className="text-green-700">{llmInsights.costSavings}</p>
                  </div>
                )}

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
                {pallets.map((pallet, index) => (
                  <div key={pallet.id || pallet.palletId || index} className="card border-l-4 border-primary-500">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-warehouse-900">
                        Pallet {index + 1} - {pallet.store || 'Unknown Store'}
                      </h4>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {pallet.type || 'regular'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-warehouse-600">Total Weight:</span>
                        <span className="ml-2 font-medium">{pallet.totalWeight || 0} kg</span>
                      </div>
                      <div>
                        <span className="text-sm text-warehouse-600">Items:</span>
                        <span className="ml-2 font-medium">{(pallet.items || []).length}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(pallet.items || []).map((item, itemIndex) => (
                        <div key={itemIndex} className="flex justify-between items-center p-2 bg-warehouse-50 rounded">
                          <span className="font-medium">{item.name || item.sku}</span>
                          <span className="text-sm text-warehouse-600">
                            {item.quantity}x @ {((item.weight || 0) / (item.quantity || 1)).toFixed(1)}kg each
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Fixed specialInstructions handling */}
                    {((pallet.specialInstructions || pallet.instructions || []).length > 0) && (
                      <div className="mt-4 pt-4 border-t border-warehouse-200">
                        <h5 className="text-sm font-medium text-warehouse-700 mb-2 flex items-center">
                          <AlertTriangle size={16} className="mr-1 text-amber-500" />
                          Special Instructions:
                        </h5>
                        <ul className="text-sm text-warehouse-600 space-y-1">
                          {(pallet.specialInstructions || pallet.instructions || []).map((instruction, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
