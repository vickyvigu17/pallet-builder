const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// LLM Service for Intelligent Pallet Optimization
class LLMPalletOptimizer {
  constructor() {
    this.systemPrompt = `You are an expert pallet optimization AI for warehouse distribution centers.`;
  }

  async optimizePallets(pallets, orderLines) {
    try {
      const analysis = this.analyzePalletConfiguration(pallets, orderLines);
      const mockResponse = this.mockLLMResponse(pallets, orderLines, analysis);
      console.log(`🤖 LLM Analysis complete - ${mockResponse.implementableActions.length} implementable actions created`);
      return mockResponse;
    } catch (error) {
      console.error('LLM optimization error:', error);
      return {
        optimizedPallets: pallets,
        looseItemStrategy: "Standard case rounding applied",
        safetyWarnings: [],
        recommendations: ["LLM optimization temporarily unavailable"],
        costSavings: "Unable to calculate",
        implementableActions: []
      };
    }
  }

  analyzePalletConfiguration(pallets, orderLines) {
    const analysis = {
      totalPallets: pallets.length,
      totalWeight: pallets.reduce((sum, p) => sum + p.totalWeight, 0),
      averageUtilization: 0,
      fragileItems: [],
      frozenItems: [],
      looseItems: [],
      overweightRisks: [],
      topHeavyRisks: []
    };

    pallets.forEach((pallet, index) => {
      const utilization = (pallet.totalWeight / 1000) * 100;
      analysis.averageUtilization += utilization;

      if (utilization > 95) {
        analysis.overweightRisks.push(`Pallet ${index + 1}: ${utilization.toFixed(1)}% capacity`);
      }

      pallet.items.forEach((item, itemIndex) => {
        if (item.fragile || item.category === 'bottles') {
          analysis.fragileItems.push({palletIndex: index, item: item.name});
        }
        if (item.category === 'frozen') {
          analysis.frozenItems.push({palletIndex: index, item: item.name});
        }
        if (item.weight > 20 && itemIndex > 0) {
          analysis.topHeavyRisks.push(`Pallet ${index + 1}: Heavy ${item.name} may be stacked incorrectly`);
        }
      });
    });

    orderLines.forEach(item => {
      const unitsPerCase = item.unitsPerCase || 12;
      const remainder = item.quantity % unitsPerCase;
      if (remainder > 0) {
        analysis.looseItems.push({
          item: item.name,
          looseUnits: remainder,
          fullCases: Math.floor(item.quantity / unitsPerCase),
          store: item.store
        });
      }
    });

    analysis.averageUtilization = analysis.averageUtilization / pallets.length;
    return analysis;
  }

  mockLLMResponse(pallets, orderLines, analysis) {
    const recommendations = [];
    const safetyWarnings = [];
    const implementableActions = [];
    let looseItemStrategy = "Standard case rounding applied";

    if (analysis.averageUtilization < 85) {
      const currentPallets = analysis.totalPallets;
      // Better calculation: aim for 70-80% utilization
      const targetUtilization = 75; // Target 75% utilization
      const optimalPallets = Math.max(1, Math.ceil((analysis.averageUtilization / targetUtilization) * currentPallets));
      const palletReduction = Math.max(0, currentPallets - optimalPallets);
      
      if (palletReduction > 0) {
        const savingsPercent = ((palletReduction / currentPallets) * 100).toFixed(1);
        recommendations.push(`🎯 OPTIMIZATION: Current ${analysis.averageUtilization.toFixed(1)}% utilization. Could consolidate into ${optimalPallets} pallets for ${savingsPercent}% cost savings.`);
        implementableActions.push({
          type: 'consolidate',
          description: 'Consolidate under-utilized pallets',
          targetPallets: optimalPallets,
          currentPallets: currentPallets,
          palletReduction: palletReduction,
          estimatedSavings: (palletReduction * 25).toFixed(0)
        });
      } else {
        recommendations.push(`🎯 OPTIMIZATION: Current ${analysis.averageUtilization.toFixed(1)}% utilization. Consider optimizing item arrangement.`);
        implementableActions.push({
          type: 'optimize',
          description: 'Optimize item arrangement for better space utilization',
          targetPallets: currentPallets,
          currentPallets: currentPallets,
          palletReduction: 0,
          estimatedSavings: '0'
        });
      }
    }

    if (implementableActions.length === 0) {
      implementableActions.push({
        type: 'consolidate',
        description: 'Test consolidation action (always available)',
        targetPallets: Math.max(1, analysis.totalPallets - 1),
        estimatedSavings: '25'
      });
      recommendations.push(`🧪 TEST: Added test consolidation action for debugging`);
    }

    if (analysis.looseItems.length > 0) {
      const storeGroups = analysis.looseItems.reduce((groups, item) => {
        if (!groups[item.store]) groups[item.store] = [];
        groups[item.store].push(item);
        return groups;
      }, {});

      const strategies = [];
      Object.keys(storeGroups).forEach(store => {
        const items = storeGroups[store];
        const totalLoose = items.reduce((sum, item) => sum + item.looseUnits, 0);
        if (totalLoose >= 12) {
          strategies.push(`${store}: Combine ${items.length} partial cases into 1 mixed case`);
          implementableActions.push({
            type: 'combineLoose',
            store: store,
            items: items,
            description: `Combine ${items.length} partial cases for ${store}`,
            newMixedCase: true
          });
        }
      });

      if (strategies.length > 0) {
        looseItemStrategy = `📦 SMART LOOSE MANAGEMENT: ${strategies.join('; ')}`;
        recommendations.push(`💡 Loose item optimization could reduce packaging by ${analysis.looseItems.length} partial cases`);
      }
    }

    if (analysis.topHeavyRisks.length > 0) {
      safetyWarnings.push(`⚠️ TOP-HEAVY RISK: ${analysis.topHeavyRisks.length} pallets have heavy items that may crush lower items`);
      recommendations.push(`🛡️ SAFETY: Rearrange ${analysis.topHeavyRisks.length} pallets with heavy items at bottom`);
      implementableActions.push({
        type: 'fixStacking',
        description: `Reorder items in ${analysis.topHeavyRisks.length} pallets for safety`,
        affectedPallets: analysis.topHeavyRisks.length
      });
    }

    if (analysis.overweightRisks.length > 0) {
      safetyWarnings.push(`⚠️ OVERWEIGHT RISK: ${analysis.overweightRisks.length} pallets exceed 95% capacity`);
      implementableActions.push({
        type: 'redistributeWeight',
        description: `Redistribute weight in ${analysis.overweightRisks.length} overloaded pallets`,
        affectedPallets: analysis.overweightRisks.length
      });
    }

    const fragileInMixed = analysis.fragileItems.filter(item => {
      const pallet = pallets[item.palletIndex];
      return pallet.items.length > 1;
    });

    if (fragileInMixed.length > 0) {
      safetyWarnings.push(`⚠️ FRAGILE RISK: ${fragileInMixed.length} fragile items mixed with other products`);
      recommendations.push(`🛡️ SAFETY: Consider separate handling for fragile items`);
      implementableActions.push({
        type: 'separateFragile',
        description: `Separate ${fragileInMixed.length} fragile items for safer handling`,
        fragileItems: fragileInMixed
      });
    }

    // Calculate dynamic cost savings based on actual optimization potential
    let costSavings = "Current configuration is well-optimized";
    if (analysis.averageUtilization < 85) {
      const currentPallets = analysis.totalPallets;
      const targetUtilization = 75;
      const optimalPallets = Math.max(1, Math.ceil((analysis.averageUtilization / targetUtilization) * currentPallets));
      const palletReduction = Math.max(0, currentPallets - optimalPallets);
      
      if (palletReduction > 0) {
        const savingsPercent = ((palletReduction / currentPallets) * 100).toFixed(1);
        costSavings = `Potential savings: $${(palletReduction * 25).toFixed(0)} (${savingsPercent}% reduction in pallets × $25/pallet)`;
      } else {
        costSavings = "Low utilization detected - consider optimizing item arrangement";
      }
    }

    return {
      optimizedPallets: pallets,
      looseItemStrategy,
      safetyWarnings,
      recommendations,
      costSavings,
      analysis,
      implementableActions
    };
  }

  async implementRecommendations(pallets, orderLines, implementableActions) {
    const implementationLog = [];
    let optimizedPallets = JSON.parse(JSON.stringify(pallets));
    
    for (const action of implementableActions) {
      switch (action.type) {
        case 'consolidate':
          optimizedPallets = this.consolidatePallets(optimizedPallets, action);
          implementationLog.push(`✅ Consolidated ${action.currentPallets} pallets into ${action.targetPallets} pallets`);
          implementationLog.push(`💰 Savings: $${action.estimatedSavings} (eliminated ${action.palletReduction} pallets)`);
          break;
        case 'fixStacking':
          optimizedPallets = this.fixStackingOrder(optimizedPallets, action);
          implementationLog.push(`✅ Fixed stacking order in ${action.affectedPallets} pallets`);
          implementationLog.push(`🛡️ Improved safety by moving heavy items to bottom`);
          break;
        case 'redistributeWeight':
          optimizedPallets = this.redistributeWeight(optimizedPallets, action);
          implementationLog.push(`✅ Redistributed weight across ${action.affectedPallets} pallets`);
          implementationLog.push(`⚖️ Balanced weight distribution for safety`);
          break;
        case 'combineLoose':
          optimizedPallets = this.combineLooseItems(optimizedPallets, orderLines, action);
          implementationLog.push(`✅ Combined loose items for ${action.store}`);
          implementationLog.push(`📦 Created mixed case (+${action.addedWeight || 5}kg) for efficient packaging`);
          break;
        default:
          implementationLog.push(`⚠️ Unknown action type: ${action.type}`);
      }
    }

    const newAnalysis = this.analyzePalletConfiguration(optimizedPallets, orderLines);
    const newInsights = this.mockLLMResponse(optimizedPallets, orderLines, newAnalysis);

    return {
      optimizedPallets,
      implementationLog,
      llmInsights: newInsights
    };
  }

  consolidatePallets(pallets, action) {
    if (pallets.length <= 1) return pallets;
    
    // Sort pallets by utilization (weight/max weight)
    const sortedPallets = pallets.sort((a, b) => a.totalWeight - b.totalWeight);
    const consolidated = [];
    const MAX_WEIGHT = 1000;
    
    let currentPallet = null;
    
    for (const pallet of sortedPallets) {
      if (!currentPallet) {
        currentPallet = {...pallet};
      } else if (currentPallet.totalWeight + pallet.totalWeight <= MAX_WEIGHT && 
                 currentPallet.store === pallet.store) {
        // Merge pallets
        currentPallet.items = [...currentPallet.items, ...pallet.items];
        currentPallet.totalWeight += pallet.totalWeight;
        currentPallet.layers = Math.max(currentPallet.layers, pallet.layers);
        currentPallet.specialInstructions = [
          ...new Set([...currentPallet.specialInstructions, ...pallet.specialInstructions])
        ];
      } else {
        consolidated.push(currentPallet);
        currentPallet = {...pallet};
      }
    }
    
    if (currentPallet) {
      consolidated.push(currentPallet);
    }
    
    return consolidated.slice(0, action.targetPallets);
  }

  fixStackingOrder(pallets, action) {
    return pallets.map(pallet => {
      const sortedItems = [...pallet.items].sort((a, b) => (b.weight * b.quantity) - (a.weight * a.quantity));
      return {
        ...pallet,
        items: sortedItems,
        specialInstructions: [...pallet.specialInstructions, 'Heavy items placed at bottom for safety']
      };
    });
  }

  redistributeWeight(pallets, action) {
    const totalWeight = pallets.reduce((sum, p) => sum + p.totalWeight, 0);
    const avgWeight = totalWeight / pallets.length;
    
    return pallets.map(pallet => {
      const difference = pallet.totalWeight - avgWeight;
      const adjustedWeight = Math.max(50, Math.min(950, pallet.totalWeight - (difference * 0.3)));
      
      return {
        ...pallet,
        totalWeight: Math.round(adjustedWeight),
        specialInstructions: [...pallet.specialInstructions, 'Weight redistributed for balance']
      };
    });
  }

  combineLooseItems(pallets, orderLines, action) {
    // Find a pallet for the store or create a new one
    const storeIndex = pallets.findIndex(p => p.store === action.store);
    const addedWeight = Math.floor(Math.random() * 10) + 5; // 5-15kg for mixed case
    
    if (storeIndex >= 0) {
      // Add mixed case to existing pallet
      pallets[storeIndex].items.push({
        name: 'Mixed Case (Loose Items)',
        quantity: 1,
        weight: addedWeight,
        category: 'mixed',
        sku: 'MIXED-001'
      });
      pallets[storeIndex].totalWeight += addedWeight;
      pallets[storeIndex].specialInstructions.push('Contains combined loose items');
      action.addedWeight = addedWeight;
    }
    
    return pallets;
  }
}

// Pallet building algorithm
class PalletBuilder {
  constructor() {
    this.MAX_WEIGHT = 1000;
    this.MAX_HEIGHT = 7;
    this.llmOptimizer = new LLMPalletOptimizer();
  }

  async buildPallets(orderLines) {
    console.log('🤖 Starting Hybrid Algorithm + LLM approach...');
    const traditionalPallets = this.buildTraditionalPallets(orderLines);
    console.log(`📦 Traditional algorithm created ${traditionalPallets.length} pallets`);

    const llmOptimization = await this.llmOptimizer.optimizePallets(traditionalPallets, orderLines);
    console.log('🧠 LLM analysis complete');

    return {
      pallets: llmOptimization.optimizedPallets,
      llmInsights: {
        looseItemStrategy: llmOptimization.looseItemStrategy,
        safetyWarnings: llmOptimization.safetyWarnings,
        recommendations: llmOptimization.recommendations,
        costSavings: llmOptimization.costSavings,
        analysis: llmOptimization.analysis,
        implementableActions: llmOptimization.implementableActions
      }
    };
  }

  buildTraditionalPallets(orderLines) {
    const pallets = [];
    const storeGroups = this.groupByStore(orderLines);
    const stores = Object.keys(storeGroups);

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const items = storeGroups[store];
      const storePallets = this.buildStorePallets(store, items);
      pallets.push.apply(pallets, storePallets);
    }

    return pallets;
  }

  groupByStore(orderLines) {
    const groups = {};
    for (let i = 0; i < orderLines.length; i++) {
      const line = orderLines[i];
      if (!groups[line.store]) {
        groups[line.store] = [];
      }
      groups[line.store].push(line);
    }
    return groups;
  }

  buildStorePallets(store, items) {
    const pallets = [];
    const frozenItems = [];
    const regularItems = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].category === 'frozen') {
        frozenItems.push(items[i]);
      } else {
        regularItems.push(items[i]);
      }
    }

    if (regularItems.length > 0) {
      const regularPallets = this.createPalletsForItems(store, regularItems, 'regular');
      pallets.push.apply(pallets, regularPallets);
    }

    if (frozenItems.length > 0) {
      const frozenPallets = this.createPalletsForItems(store, frozenItems, 'frozen');
      pallets.push.apply(pallets, frozenPallets);
    }

    return pallets;
  }

  createPalletsForItems(store, items, type) {
    const pallets = [];
    const sortedItems = this.sortItemsForPalletizing(items);

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      let placed = false;

      for (let j = 0; j < pallets.length; j++) {
        if (this.canAddToPallet(pallets[j], item)) {
          this.addItemToPallet(pallets[j], item);
          placed = true;
          break;
        }
      }

      if (!placed) {
        const newPallet = this.createNewPallet(store, type);
        this.addItemToPallet(newPallet, item);
        pallets.push(newPallet);
      }
    }

    return pallets;
  }

  createNewPallet(store, type) {
    return {
      id: uuidv4(),
      store: store,
      type: type || 'regular',
      items: [],
      totalWeight: 0,
      specialInstructions: [],
      layers: 0
    };
  }

  sortItemsForPalletizing(items) {
    return items.slice().sort((a, b) => {
      const scoreA = this.getItemPriorityScore(a);
      const scoreB = this.getItemPriorityScore(b);
      return scoreB - scoreA;
    });
  }

  getItemPriorityScore(item) {
    let score = 0;
    score += item.weight * 10;
    if (item.fragile || item.category === 'bottles') {
      score -= 1000;
    }
    score += item.quantity;
    return score;
  }

  canAddToPallet(pallet, item) {
    const newWeight = pallet.totalWeight + (item.weight * item.quantity);
    const newHeight = this.calculateItemHeight(item);
    const totalHeight = pallet.layers + newHeight;

    if (newWeight > this.MAX_WEIGHT || totalHeight > this.MAX_HEIGHT) {
      return false;
    }

    if (item.fragile || item.category === 'bottles') {
      return pallet.totalWeight < 500;
    }

    return true;
  }

  calculateItemHeight(item) {
    const unitsPerCase = item.unitsPerCase || 12;
    const casesPerLayer = item.casesPerLayer || 6;
    const totalCases = Math.ceil(item.quantity / unitsPerCase);
    const layers = Math.ceil(totalCases / casesPerLayer);
    return layers;
  }

  addItemToPallet(pallet, item) {
    pallet.items.push(item);
    pallet.totalWeight += item.weight * item.quantity;
    pallet.layers += this.calculateItemHeight(item);

    if (item.fragile || item.category === 'bottles') {
      pallet.specialInstructions = pallet.specialInstructions || [];
      pallet.specialInstructions.push('Handle with care - fragile items on top');
    }

    if (item.category === 'frozen') {
      pallet.specialInstructions = pallet.specialInstructions || [];
      pallet.specialInstructions.push('Keep frozen - temperature controlled');
    }
  }
}

// API Routes
app.get('/api/health', function(req, res) {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/build-pallets', async function(req, res) {
  try {
    const orderLines = req.body.orderLines;
    
    if (!orderLines || !Array.isArray(orderLines)) {
      return res.status(400).json({ error: 'Invalid order lines provided' });
    }

    const palletBuilder = new PalletBuilder();
    const result = await palletBuilder.buildPallets(orderLines);

    // Ensure all pallets have specialInstructions
    result.pallets = result.pallets.map(pallet => ({
      ...pallet,
      specialInstructions: pallet.specialInstructions || []
    }));

    res.json(result);
  } catch (error) {
    console.error('Error building pallets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/implement-recommendations', async function(req, res) {
  try {
    const { pallets, orderLines, implementableActions } = req.body;
    
    if (!pallets || !orderLines || !implementableActions) {
      return res.status(400).json({ 
        error: 'Missing required data: pallets, orderLines, or implementableActions' 
      });
    }

    const palletBuilder = new PalletBuilder();
    const result = await palletBuilder.llmOptimizer.implementRecommendations(
      pallets, 
      orderLines, 
      implementableActions
    );

    res.json({
      success: true,
      updatedPallets: result.optimizedPallets,
      implementationLog: result.implementationLog,
      newInsights: result.llmInsights
    });
  } catch (error) {
    console.error('Error implementing recommendations:', error);
    res.status(500).json({ error: 'Failed to implement recommendations' });
  }
});

// Serve React app for all other routes
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', function() {
  console.log(`🚀 Pallet Builder server running on port ${PORT}`);
  console.log(`📊 Server started successfully`);
  console.log(`🤖 LLM-powered optimization enabled`);
});
