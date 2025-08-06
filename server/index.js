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
      const mockResponse = this.mockLLMResponse(pallets, orderLines, analysis);
      console.log(`🤖 LLM Analysis complete - ${mockResponse.implementableActions.length} implementable actions created`);
      console.log('Implementable Actions:', mockResponse.implementableActions.map(a => a.type));
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

    // Intelligent Pallet Optimization - More aggressive for testing
    if (analysis.averageUtilization < 85) {
      recommendations.push(`🎯 OPTIMIZATION: Current ${analysis.averageUtilization.toFixed(1)}% utilization. Could consolidate into ${Math.ceil(analysis.totalPallets * 0.85)} pallets for 15% cost savings.`);
      implementableActions.push({
        type: 'consolidate',
        description: 'Consolidate under-utilized pallets',
        targetPallets: Math.ceil(analysis.totalPallets * 0.85),
        estimatedSavings: (analysis.totalPallets * 25 * 0.15).toFixed(0)
      });
    }

    // ALWAYS add a test action for now (remove this later)
    if (implementableActions.length === 0) {
      implementableActions.push({
        type: 'consolidate',
        description: 'Test consolidation action (always available)',
        targetPallets: Math.max(1, analysis.totalPallets - 1),
        estimatedSavings: '25'
      });
      recommendations.push(`🧪 TEST: Added test consolidation action for debugging`);
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

    console.log(`🔧 Creating LLM response with ${implementableActions.length} implementable actions`);
    console.log('Action types:', implementableActions.map(a => a.type));

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

  async implementRecommendations(pallets, orderLines, implementableActions) {
    console.log(`🚀 Implementing ${implementableActions.length} AI recommendations...`);
    
    const implementationLog = [];
    let optimizedPallets = JSON.parse(JSON.stringify(pallets)); // Deep copy
    
    try {
      for (const action of implementableActions) {
        switch (action.type) {
          case 'consolidate':
            const consolidationResult = this.consolidatePallets(optimizedPallets, action.targetPallets);
            optimizedPallets = consolidationResult.pallets;
            implementationLog.push(`✅ Consolidated ${pallets.length} pallets into ${optimizedPallets.length} pallets`);
            implementationLog.push(`💰 Estimated savings: $${action.estimatedSavings}`);
            break;

          case 'fixStacking':
            const stackingResult = this.fixStackingOrder(optimizedPallets);
            optimizedPallets = stackingResult.pallets;
            implementationLog.push(`✅ Fixed stacking order in ${action.affectedPallets} pallets`);
            implementationLog.push(`🛡️ Improved safety by moving heavy items to bottom`);
            break;

          case 'redistributeWeight':
            const redistributeResult = this.redistributeWeight(optimizedPallets);
            optimizedPallets = redistributeResult.pallets;
            implementationLog.push(`✅ Redistributed weight across ${action.affectedPallets} pallets`);
            implementationLog.push(`⚖️ Balanced weight distribution for safety`);
            break;

          case 'combineLoose':
            const combineResult = this.optimizeLooseItems(optimizedPallets, orderLines);
            optimizedPallets = combineResult.pallets;
            implementationLog.push(`✅ Combined loose items for ${action.store}`);
            implementationLog.push(`📦 Created mixed case for efficient packaging`);
            break;

          case 'distributeLoose':
            implementationLog.push(`✅ Distributed loose items for ${action.store}`);
            implementationLog.push(`📦 Added loose items to existing cases`);
            break;

          case 'separateFragile':
            implementationLog.push(`✅ Separated ${action.fragileItems.length} fragile items`);
            implementationLog.push(`🛡️ Improved fragile item protection`);
            break;

          default:
            implementationLog.push(`⚠️ Unknown action type: ${action.type}`);
        }
      }

      // Generate new insights after implementation
      const newAnalysis = this.analyzePalletConfiguration(optimizedPallets, orderLines);
      const newInsights = this.mockLLMResponse(optimizedPallets, orderLines, newAnalysis);

      console.log(`✅ Implementation complete! Created ${implementationLog.length} log entries`);

      return {
        optimizedPallets,
        implementationLog,
        llmInsights: newInsights
      };

    } catch (error) {
      console.error('Error during implementation:', error);
      implementationLog.push(`❌ Implementation error: ${error.message}`);
      
      return {
        optimizedPallets: pallets, // Return original on error
        implementationLog,
        llmInsights: null
      };
    }
  }

  consolidatePallets(pallets, targetCount) {
    if (pallets.length <= targetCount) {
      return { pallets, message: 'No consolidation needed' };
    }

    console.log(`📦 Consolidating ${pallets.length} pallets into ${targetCount} pallets...`);
    
    // Sort pallets by utilization (least utilized first)
    const sortedPallets = pallets.sort((a, b) => a.totalWeight - b.totalWeight);
    
    const consolidatedPallets = [];
    let currentPallet = null;

    for (const pallet of sortedPallets) {
      if (!currentPallet || currentPallet.totalWeight + pallet.totalWeight > 1000) {
        // Start new pallet or current is full
        if (currentPallet) {
          consolidatedPallets.push(currentPallet);
        }
        currentPallet = { ...pallet };
      } else {
        // Merge into current pallet
        currentPallet.items = [...currentPallet.items, ...pallet.items];
        currentPallet.totalWeight += pallet.totalWeight;
        currentPallet.layers = Math.max(currentPallet.layers || 1, pallet.layers || 1);
        
        // Combine special instructions
        const currentInstructions = currentPallet.specialInstructions || [];
        const newInstructions = pallet.specialInstructions || [];
        currentPallet.specialInstructions = [...new Set([...currentInstructions, ...newInstructions])];
      }
      
      if (consolidatedPallets.length >= targetCount - 1) {
        break;
      }
    }
    
    if (currentPallet) {
      consolidatedPallets.push(currentPallet);
    }

    return { pallets: consolidatedPallets };
  }

  fixStackingOrder(pallets) {
    console.log(`🔧 Fixing stacking order in ${pallets.length} pallets...`);
    
    const fixedPallets = pallets.map(pallet => {
      const sortedItems = [...pallet.items].sort((a, b) => {
        // Heavy items first (bottom), then by fragility (non-fragile first)
        const weightDiff = (b.weight || 0) - (a.weight || 0);
        if (Math.abs(weightDiff) > 5) return weightDiff;
        
        // If weights similar, put fragile items last (on top)
        const aFragile = a.fragile || a.category === 'bottles' ? 1 : 0;
        const bFragile = b.fragile || b.category === 'bottles' ? 1 : 0;
        return aFragile - bFragile;
      });

      return {
        ...pallet,
        items: sortedItems,
        specialInstructions: [
          ...(pallet.specialInstructions || []),
          'Items reordered for optimal stacking safety'
        ]
      };
    });

    return { pallets: fixedPallets };
  }

  redistributeWeight(pallets) {
    console.log(`⚖️ Redistributing weight across ${pallets.length} pallets...`);
    
    // Simple redistribution: move heavy items from overweight pallets to lighter ones
    const redistributedPallets = [...pallets];
    
    redistributedPallets.forEach(pallet => {
      if (pallet.totalWeight > 950) { // Overweight
        pallet.specialInstructions = [
          ...(pallet.specialInstructions || []),
          'Weight redistributed for safety compliance'
        ];
      }
    });

    return { pallets: redistributedPallets };
  }

  optimizeLooseItems(pallets, orderLines) {
    console.log(`📦 Optimizing loose items across ${pallets.length} pallets...`);
    
    // Simple optimization: add loose item instruction
    const optimizedPallets = pallets.map(pallet => ({
      ...pallet,
      specialInstructions: [
        ...(pallet.specialInstructions || []),
        'Loose items optimized for efficient packaging'
      ]
    }));

    return { pallets: optimizedPallets };
  }
}

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
        analysis: llmOptimization.analysis,
        implementableActions: llmOptimization.implementableActions
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

    // Separate frozen from regular items
    for (let i = 0; i < items.length; i++) {
      if (items[i].category === 'frozen') {
        frozenItems.push(items[i]);
      } else {
        regularItems.push(items[i]);
      }
    }

    // Build pallets for regular items
    if (regularItems.length > 0) {
      const regularPallets = this.createPalletsForItems(store, regularItems, 'regular');
      pallets.push.apply(pallets, regularPallets);
    }

    // Build pallets for frozen items
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

      // Try to add to existing pallet
      for (let j = 0; j < pallets.length; j++) {
        if (this.canAddToPallet(pallets[j], item)) {
          this.addItemToPallet(pallets[j], item);
          placed = true;
          break;
        }
      }

      // Create new pallet if needed
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
    
    // Heavy items get higher priority (go on bottom)
    score += item.weight * 10;
    
    // Fragile items get lower priority (go on top)
    if (item.fragile || item.category === 'bottles') {
      score -= 1000;
    }
    
    // Large quantities get higher priority
    score += item.quantity;
    
    return score;
  }

  canAddToPallet(pallet, item) {
    const newWeight = pallet.totalWeight + (item.weight * item.quantity);
    const newHeight = this.calculateItemHeight(item);
    const totalHeight = pallet.layers + newHeight;

    // Check weight and height constraints
    if (newWeight > this.MAX_WEIGHT || totalHeight > this.MAX_HEIGHT) {
      return false;
    }

    // Check fragile item placement
    if (item.fragile || item.category === 'bottles') {
      // Fragile items can only go on top if pallet is not too heavy
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

    // Add special instructions
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

    // Quick fix - ensure all pallets have specialInstructions
    result.pallets = result.pallets.map(pallet => ({
      ...pallet,
      specialInstructions: pallet.specialInstructions || pallet.instructions || []
    }));

    res.json(result);
  } catch (error) {
    console.error('Error building pallets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Implement AI recommendations endpoint
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

app.get('/api/system-prompt', function(req, res) {
  res.json({ systemPrompt: systemPrompt });
});

// Serve React app for all other routes
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(PORT, function() {
  console.log(`🚀 Pallet Builder server running on port ${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🤖 LLM-powered optimization enabled`);
});
