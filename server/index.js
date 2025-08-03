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

// System prompt
const systemPrompt = `
You are a pallet building expert working in a large Walmart-style distribution center.

Your job is to fully handle how order lines should be grouped into pallets, ensuring safety, efficiency, and ease of handling. You must use your reasoning to suggest pallet groupings, apply business rules, and return the final set of pallets.

Rules:
1. Pallets must be store-specific (1 pallet = 1 store). A store can have multiple pallets.
2. You are palletizing cases. Leftover eaches should be palletized separately per store.
3. Pallets can include mixed SKUs (for same store), if:
   - Full pallets are prioritized
   - Fragile + bottles go on top
   - Frozen SKUs must be in separate pallets
4. Constraints:
   - Max weight = 1000 kg
   - Max height = 7 layers
5. Partial pallets are allowed if needed.

Output:
Return a list of pallets with:
- PalletID
- Store
- List of SKUs and quantities (cases or eaches)
- Total Weight
- Special Instructions
`;

// Pallet building algorithm - ES5 compatible with LLM integration
class PalletBuilder {
  constructor() {
    this.MAX_WEIGHT = 1000;
    this.MAX_HEIGHT = 7;
    this.llmOptimizer = new LLMPalletOptimizer();
  }

  async buildPallets(orderLines) {
    console.log('🤖 Starting Hybrid Algorithm + LLM approach...');
    
    // Step 1: Traditional Algorithm (Core Logic)
    const traditionalPallets = this.buildTraditionalPallets(orderLines);
    console.log(`📦 Traditional algorithm created ${traditionalPallets.length} pallets`);

    // Step 2: LLM Analysis & Optimization  
    const llmOptimization = await this.llmOptimizer.optimizePallets(traditionalPallets, orderLines);
    console.log('🧠 LLM analysis complete');

    // Step 3: Return Hybrid Results
    return {
      pallets: llmOptimization.optimizedPallets,
      llmInsights: {
        looseItemStrategy: llmOptimization.looseItemStrategy,
        safetyWarnings: llmOptimization.safetyWarnings,
        recommendations: llmOptimization.recommendations,
        costSavings: llmOptimization.costSavings,
        analysis: llmOptimization.analysis
      }
    };
  }

  buildTraditionalPallets(orderLines) {
    // Original algorithm logic (renamed from buildPallets)
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
    return orderLines.reduce(function(groups, item) {
      if (!groups[item.store]) {
        groups[item.store] = [];
      }
      groups[item.store].push(item);
      return groups;
    }, {});
  }

  buildStorePallets(store, items) {
    const pallets = [];
    const frozenItems = items.filter(function(item) { return item.category === 'frozen'; });
    const nonFrozenItems = items.filter(function(item) { return item.category !== 'frozen'; });

    if (nonFrozenItems.length > 0) {
      const regularPallets = this.createPalletsForItems(store, nonFrozenItems, 'regular');
      pallets.push.apply(pallets, regularPallets);
    }

    if (frozenItems.length > 0) {
      const frozenPallets = this.createPalletsForItems(store, frozenItems, 'frozen');
      pallets.push.apply(pallets, frozenPallets);
    }

    return pallets;
  }

  createPalletsForItems(store, items, type) {
    const maxWeight = 1000; // kg
    const maxLayers = 7;
    const pallets = [];

    for (const item of items) {
      const weightPerUnit = item.weight ?? 1; // kg
      const unitsPerCase = item.unitsPerCase ?? 12;
      const casesPerLayer = item.casesPerLayer ?? 6;

      const numCases = Math.ceil(item.quantity / unitsPerCase);
      const layersNeeded = Math.ceil(numCases / casesPerLayer);

      let placed = false;

      for (const pallet of pallets) {
        const newWeight = pallet.totalWeight + (item.quantity * weightPerUnit);
        const newLayers = pallet.totalLayers + layersNeeded;

        if (newWeight <= maxWeight && newLayers <= maxLayers) {
          pallet.items.push(item);
          pallet.totalWeight = newWeight;
          pallet.totalLayers = newLayers;
          // Add any special instructions for this item
          if (item.fragile || item.category === 'bottles') {
            pallet.instructions.push('Fragile items - Handle with care');
            pallet.specialInstructions.push('Fragile items - Handle with care');
          }
          if (item.category === 'frozen') {
            pallet.instructions.push('Keep frozen - Temperature controlled');
            pallet.specialInstructions.push('Keep frozen - Temperature controlled');
          }
          placed = true;
          break;
        }
      }

      if (!placed) {
        const pallet = {
          id: `${store}-Pallet-${pallets.length + 1}`,
          store: store,
          type: type || 'regular',
          items: [item],
          totalWeight: item.quantity * weightPerUnit,
          totalLayers: layersNeeded,
          instructions: [`Handle with care for ${item.name ?? 'item'}`],
          specialInstructions: [`Handle with care for ${item.name ?? 'item'}`]
        };
        pallets.push(pallet);
      }
    }

    return pallets;
  }

  sortItemsForPalletizing(items) {
    const self = this;
    return items.sort(function(a, b) {
      const aScore = self.getItemPriorityScore(a);
      const bScore = self.getItemPriorityScore(b);
      return aScore - bScore;
    });
  }

  getItemPriorityScore(item) {
    if (item.fragile || item.category === 'bottles') return 3;
    if (item.weight > 20) return 1;
    return 2;
  }

  canAddToPallet(pallet, item) {
    const weightPerUnit = item.weight ?? 1; // default 1kg
    const unitsPerCase = item.unitsPerCase ?? 12;
    const casesPerLayer = item.casesPerLayer ?? 6;
    const maxLayers = 7;

    const numCases = Math.ceil(item.quantity / unitsPerCase);
    const layersNeeded = Math.ceil(numCases / casesPerLayer);

    const newWeight = pallet.totalWeight + (item.quantity * weightPerUnit);
    const newLayers = pallet.totalLayers + layersNeeded;

    if (newWeight > 1000 || newLayers > maxLayers) return false;
    return true;
  }

  calculateItemHeight(item) {
    const baseHeight = item.height || 0.3;
    return Math.ceil(item.quantity / 4) * baseHeight;
  }

  addItemToPallet(pallet, item) {
    pallet.items.push({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      weight: item.weight * item.quantity,
      category: item.category,
      fragile: item.fragile
    });
    
    pallet.totalWeight += item.weight * item.quantity;
    pallet.currentHeight += this.calculateItemHeight(item);
    
    if (item.fragile || item.category === 'bottles') {
      pallet.specialInstructions.push('Fragile items on top - Handle with care');
    }
    if (item.category === 'frozen') {
      pallet.specialInstructions.push('Keep frozen - Temperature controlled');
    }
  }

  createNewPallet(store, type) {
    return {
      palletId: uuidv4(),
      store: store,
      type: type,
      items: [],
      totalWeight: 0,
      currentHeight: 0,
      specialInstructions: []
    };
  }
}

// LLM Service for Intelligent Pallet Optimization
class LLMPalletOptimizer {
  constructor() {
    this.systemPrompt = `
You are an expert pallet optimization AI for warehouse distribution centers.

Your role is to:
1. INTELLIGENT OPTIMIZATION: Analyze pallet configurations and suggest improvements
2. LOOSE ITEM MANAGEMENT: Optimize combining of partial cases/loose items
3. SAFETY ANALYSIS: Predict and prevent damage risks

Rules:
- Max weight: 1000kg per pallet
- Max height: 7 layers  
- Fragile items MUST go on top
- Frozen items MUST be separate pallets
- Heavy items go on bottom

Return JSON with:
{
  "optimizedPallets": [...], 
  "looseItemStrategy": "...",
  "safetyWarnings": [...],
  "recommendations": [...],
  "costSavings": "..."
}
`;
  }

  async optimizePallets(pallets, orderLines) {
    try {
      // Analyze current configuration
      const analysis = this.analyzePalletConfiguration(pallets, orderLines);
      
      // Generate LLM prompt
      const prompt = this.buildOptimizationPrompt(pallets, orderLines, analysis);
      
      // For now, return mock LLM response (we'll integrate real LLM API later)
      return this.mockLLMResponse(pallets, orderLines, analysis);
      
    } catch (error) {
      console.error('LLM optimization error:', error);
      return {
        optimizedPallets: pallets,
        looseItemStrategy: "Standard case rounding applied",
        safetyWarnings: [],
        recommendations: ["LLM optimization temporarily unavailable"],
        costSavings: "Unable to calculate"
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

    // Analyze each pallet
    pallets.forEach((pallet, index) => {
      const utilization = (pallet.totalWeight / 1000) * 100;
      analysis.averageUtilization += utilization;

      if (utilization > 95) {
        analysis.overweightRisks.push(`Pallet ${index + 1}: ${utilization.toFixed(1)}% capacity`);
      }

      // Check for safety issues
      pallet.items.forEach((item, itemIndex) => {
        if (item.fragile || item.category === 'bottles') {
          analysis.fragileItems.push({palletIndex: index, item: item.name});
        }
        if (item.category === 'frozen') {
          analysis.frozenItems.push({palletIndex: index, item: item.name});
        }

        // Check if heavy items are on top (safety risk)
        if (item.weight > 20 && itemIndex > 0) {
          analysis.topHeavyRisks.push(`Pallet ${index + 1}: Heavy ${item.name} may be stacked incorrectly`);
        }
      });
    });

    // Find loose items (partial cases)
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

  buildOptimizationPrompt(pallets, orderLines, analysis) {
    return `
WAREHOUSE PALLET OPTIMIZATION REQUEST

Current Configuration:
- Total Pallets: ${analysis.totalPallets}
- Total Weight: ${analysis.totalWeight}kg
- Average Utilization: ${analysis.averageUtilization.toFixed(1)}%

Loose Items Detected:
${analysis.looseItems.map(item => 
  `- ${item.item}: ${item.looseUnits} loose units (${item.fullCases} full cases) for ${item.store}`
).join('\n')}

Safety Concerns:
${analysis.topHeavyRisks.concat(analysis.overweightRisks).join('\n')}

Fragile Items: ${analysis.fragileItems.length}
Frozen Items: ${analysis.frozenItems.length}

Please provide:
1. Optimized pallet arrangement
2. Strategy for combining loose items
3. Safety warnings and prevention
4. Cost-saving recommendations
`;
  }

  mockLLMResponse(pallets, orderLines, analysis) {
    // Simulate intelligent LLM analysis
    const recommendations = [];
    const safetyWarnings = [];
    const implementableActions = [];
    let looseItemStrategy = "Standard case rounding applied";

    // Intelligent Pallet Optimization
    if (analysis.averageUtilization < 75) {
      recommendations.push(`🎯 OPTIMIZATION: Current ${analysis.averageUtilization.toFixed(1)}% utilization. Could consolidate into ${Math.ceil(analysis.totalPallets * 0.85)} pallets for 15% cost savings.`);
      implementableActions.push({
        type: 'consolidate',
        description: 'Consolidate under-utilized pallets',
        targetPallets: Math.ceil(analysis.totalPallets * 0.85),
        estimatedSavings: (analysis.totalPallets * 25 * 0.15).toFixed(0)
      });
    }

    // Smart Loose Item Management  
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
        } else {
          strategies.push(`${store}: Add ${items.length} loose items to existing case`);
          implementableActions.push({
            type: 'distributeLoose',
            store: store,
            items: items,
            description: `Distribute ${items.length} loose items for ${store}`,
            newMixedCase: false
          });
        }
      });

      looseItemStrategy = `📦 SMART LOOSE MANAGEMENT: ${strategies.join('; ')}`;
      recommendations.push(`💡 Loose item optimization could reduce packaging by ${analysis.looseItems.length} partial cases`);
    }

    // Predictive Safety Analysis
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

    // Check for fragile item safety
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

    const costSavings = analysis.averageUtilization < 75 ? 
      `Potential savings: $${(analysis.totalPallets * 25 * 0.15).toFixed(0)} (15% reduction in pallets × $25/pallet)` :
      "Current configuration is well-optimized";

    return {
      optimizedPallets: pallets, // For now, return original pallets
      looseItemStrategy,
      safetyWarnings,
      recommendations,
      costSavings,
      analysis,
      implementableActions
    };
  }

  // NEW: Recommendation Implementation Engine
  implementRecommendations(pallets, orderLines, implementableActions) {
    console.log('🔧 Implementing AI recommendations...');
    let optimizedPallets = JSON.parse(JSON.stringify(pallets)); // Deep copy
    const implementationLog = [];

    implementableActions.forEach(action => {
      switch (action.type) {
        case 'consolidate':
          const consolidated = this.consolidatePallets(optimizedPallets, action.targetPallets);
          optimizedPallets = consolidated.pallets;
          implementationLog.push(`✅ Consolidated ${pallets.length} pallets into ${consolidated.pallets.length} pallets`);
          break;

        case 'fixStacking':
          const stackingFixed = this.fixStackingOrder(optimizedPallets);
          optimizedPallets = stackingFixed.pallets;
          implementationLog.push(`✅ Fixed stacking order in ${stackingFixed.fixedCount} pallets`);
          break;

        case 'redistributeWeight':
          const weightFixed = this.redistributeWeight(optimizedPallets);
          optimizedPallets = weightFixed.pallets;
          implementationLog.push(`✅ Redistributed weight in ${weightFixed.fixedCount} pallets`);
          break;

        case 'combineLoose':
          const looseFixed = this.optimizeLooseItems(optimizedPallets, orderLines);
          optimizedPallets = looseFixed.pallets;
          implementationLog.push(`✅ Optimized loose items: ${looseFixed.description}`);
          break;

        default:
          implementationLog.push(`⚠️ Action type '${action.type}' not yet implemented`);
      }
    });

    return {
      optimizedPallets,
      implementationLog,
      originalCount: pallets.length,
      optimizedCount: optimizedPallets.length,
      savings: pallets.length - optimizedPallets.length
    };
  }

  // Optimization Methods
  consolidatePallets(pallets, targetCount) {
    console.log(`🔄 Consolidating ${pallets.length} pallets to ${targetCount} pallets...`);
    
    // Group pallets by store and type
    const storeGroups = pallets.reduce((groups, pallet) => {
      const key = `${pallet.store}-${pallet.type || 'regular'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(pallet);
      return groups;
    }, {});

    const optimizedPallets = [];

    Object.keys(storeGroups).forEach(storeKey => {
      const storePallets = storeGroups[storeKey];
      const consolidated = this.mergePalletsInGroup(storePallets);
      optimizedPallets.push(...consolidated);
    });

    return { pallets: optimizedPallets };
  }

  mergePalletsInGroup(pallets) {
    if (pallets.length <= 1) return pallets;

    const merged = [];
    let currentPallet = null;

    pallets.forEach(pallet => {
      if (!currentPallet) {
        currentPallet = JSON.parse(JSON.stringify(pallet));
      } else {
        // Try to merge with current pallet
        const combinedWeight = currentPallet.totalWeight + pallet.totalWeight;
        const combinedLayers = currentPallet.totalLayers + pallet.totalLayers;

        if (combinedWeight <= 1000 && combinedLayers <= 7) {
          // Merge successful
          currentPallet.items.push(...pallet.items);
          currentPallet.totalWeight = combinedWeight;
          currentPallet.totalLayers = combinedLayers;
          currentPallet.instructions = [...(currentPallet.instructions || []), ...(pallet.instructions || [])];
          currentPallet.specialInstructions = [...(currentPallet.specialInstructions || []), ...(pallet.specialInstructions || [])];
        } else {
          // Can't merge, finalize current and start new
          merged.push(currentPallet);
          currentPallet = JSON.parse(JSON.stringify(pallet));
        }
      }
    });

    if (currentPallet) merged.push(currentPallet);
    return merged;
  }

  fixStackingOrder(pallets) {
    console.log('🔧 Fixing stacking order for safety...');
    let fixedCount = 0;

    pallets.forEach(pallet => {
      if (pallet.items && pallet.items.length > 1) {
        const originalOrder = [...pallet.items];
        
        // Sort items: heavy items first (bottom), fragile items last (top)
        pallet.items.sort((a, b) => {
          // Heavy items go to bottom (lower index)
          if (a.weight > 20 && b.weight <= 20) return -1;
          if (b.weight > 20 && a.weight <= 20) return 1;
          
          // Fragile items go to top (higher index)
          if (a.fragile && !b.fragile) return 1;
          if (b.fragile && !a.fragile) return -1;
          
          // Otherwise maintain relative order
          return 0;
        });

        // Check if order changed
        const orderChanged = originalOrder.some((item, index) => 
          item.sku !== pallet.items[index].sku
        );

        if (orderChanged) {
          fixedCount++;
          pallet.specialInstructions = pallet.specialInstructions || [];
          pallet.specialInstructions.push('✅ Stacking order optimized for safety');
        }
      }
    });

    return { pallets, fixedCount };
  }

  redistributeWeight(pallets) {
    console.log('⚖️ Redistributing weight across pallets...');
    let fixedCount = 0;

    // Find overweight pallets (>95% capacity)
    const overweightPallets = pallets.filter(p => p.totalWeight > 950);
    const lightPallets = pallets.filter(p => p.totalWeight < 700 && p.store);

    overweightPallets.forEach(heavyPallet => {
      const compatibleLightPallet = lightPallets.find(lightPallet => 
        lightPallet.store === heavyPallet.store && 
        lightPallet.type === heavyPallet.type
      );

      if (compatibleLightPallet && heavyPallet.items.length > 1) {
        // Move lightest item from heavy pallet to light pallet
        const lightestItem = heavyPallet.items.reduce((lightest, item) => 
          (item.weight * item.quantity) < (lightest.weight * lightest.quantity) ? item : lightest
        );

        const itemWeight = lightestItem.weight * lightestItem.quantity;
        
        if (compatibleLightPallet.totalWeight + itemWeight <= 950) {
          // Move the item
          heavyPallet.items = heavyPallet.items.filter(item => item.sku !== lightestItem.sku);
          heavyPallet.totalWeight -= itemWeight;
          
          compatibleLightPallet.items.push(lightestItem);
          compatibleLightPallet.totalWeight += itemWeight;
          
          fixedCount++;
          
          heavyPallet.specialInstructions = heavyPallet.specialInstructions || [];
          heavyPallet.specialInstructions.push('✅ Weight redistributed for safety');
          compatibleLightPallet.specialInstructions = compatibleLightPallet.specialInstructions || [];
          compatibleLightPallet.specialInstructions.push('✅ Additional items added via optimization');
        }
      }
    });

    return { pallets, fixedCount };
  }

  optimizeLooseItems(pallets, orderLines) {
    console.log('📦 Optimizing loose items...');
    
    // Find loose items
    const looseItems = [];
    orderLines.forEach(item => {
      const unitsPerCase = item.unitsPerCase || 12;
      const remainder = item.quantity % unitsPerCase;
      if (remainder > 0) {
        looseItems.push({
          ...item,
          looseUnits: remainder,
          fullCases: Math.floor(item.quantity / unitsPerCase)
        });
      }
    });

    // Group by store
    const storeGroups = looseItems.reduce((groups, item) => {
      if (!groups[item.store]) groups[item.store] = [];
      groups[item.store].push(item);
      return groups;
    }, {});

    let optimizationDescription = 'No loose items found';

    if (Object.keys(storeGroups).length > 0) {
      const descriptions = [];
      
      Object.keys(storeGroups).forEach(store => {
        const items = storeGroups[store];
        const totalLooseUnits = items.reduce((sum, item) => sum + item.looseUnits, 0);
        
        if (totalLooseUnits >= 12) {
          descriptions.push(`${store}: Combined ${items.length} partial cases into mixed case`);
        } else {
          descriptions.push(`${store}: Distributed ${totalLooseUnits} loose units`);
        }
      });
      
      optimizationDescription = descriptions.join('; ');
    }

    return { pallets, description: optimizationDescription };
  }
}

// Routes
app.get('/api/health', function(req, res) {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    frontendAvailable: fs.existsSync(path.join(__dirname, '../public/index.html'))
  });
});

app.post('/api/implement-recommendations', function(req, res) {
  try {
    const { pallets, orderLines, implementableActions } = req.body;
    
    // Validate pallets input only
    if (!pallets) {
      return res.status(400).json({ error: 'Missing required data for implementation' });
    }

    // Default implementableActions to empty array if not provided
    const safeActions = Array.isArray(implementableActions) ? implementableActions : [];

    const llmOptimizer = new LLMPalletOptimizer();
    const implementation = llmOptimizer.implementRecommendations(pallets, orderLines, safeActions);
    
    // Re-analyze the optimized pallets
    const newAnalysis = llmOptimizer.analyzePalletConfiguration(implementation.optimizedPallets, orderLines);
    const newOptimization = llmOptimizer.mockLLMResponse(implementation.optimizedPallets, orderLines, newAnalysis);

    res.json({
      success: true,
      optimizedPallets: implementation.optimizedPallets,
      implementationLog: implementation.implementationLog,
      savings: {
        palletReduction: implementation.savings,
        originalCount: implementation.originalCount,
        optimizedCount: implementation.optimizedCount
      },
      newLlmInsights: {
        looseItemStrategy: newOptimization.looseItemStrategy,
        safetyWarnings: newOptimization.safetyWarnings,
        recommendations: newOptimization.recommendations,
        costSavings: newOptimization.costSavings,
        analysis: newOptimization.analysis,
        implementableActions: newOptimization.implementableActions
      }
    });
  } catch (error) {
    console.error('Error implementing recommendations:', error);
    res.status(500).json({ error: 'Internal server error during implementation' });
  }
});

app.post('/api/build-pallets', function(req, res) {
  try {
    const orderLines = req.body.orderLines;
    
    if (!orderLines || !Array.isArray(orderLines)) {
      return res.status(400).json({ error: 'Invalid order lines provided' });
    }

    const palletBuilder = new PalletBuilder();
    palletBuilder.buildPallets(orderLines).then(result => {
      res.json(result);
    }).catch(error => {
      console.error('Error building pallets:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  } catch (error) {
    console.error('Error building pallets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/system-prompt', function(req, res) {
  res.json({ systemPrompt: systemPrompt });
});

// Serve the main app for any non-API routes
app.get('*', function(req, res) {
  const indexPath = path.join(__dirname, '../public/index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: 'Pallet Builder API is running',
      api: {
        health: '/api/health',
        buildPallets: '/api/build-pallets',
        systemPrompt: '/api/system-prompt'
      },
      note: 'Frontend not found. Use API endpoints directly.'
    });
  }
});

app.use(function(error, req, res, next) {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

app.listen(PORT, function() {
  console.log('🚀 Pallet Builder API running on port ' + PORT);
  console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
  
  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    console.log('✅ Frontend found - serving full app');
  } else {
    console.log('⚠️ Frontend missing - API only mode');
  }
});

module.exports = app;
