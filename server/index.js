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

// Pallet building algorithm - ES5 compatible
class PalletBuilder {
  constructor() {
    this.MAX_WEIGHT = 1000;
    this.MAX_HEIGHT = 7;
  }

  buildPallets(orderLines) {
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

// Routes
app.get('/api/health', function(req, res) {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    frontendAvailable: fs.existsSync(path.join(__dirname, '../public/index.html'))
  });
});

app.post('/api/build-pallets', function(req, res) {
  try {
    const orderLines = req.body.orderLines;
    
    if (!orderLines || !Array.isArray(orderLines)) {
      return res.status(400).json({ error: 'Invalid order lines provided' });
    }

    const palletBuilder = new PalletBuilder();
    const pallets = palletBuilder.buildPallets(orderLines);

    const storeSet = {};
    for (let i = 0; i < pallets.length; i++) {
      storeSet[pallets[i].store] = true;
    }
    const uniqueStores = Object.keys(storeSet).length;

    let totalWeight = 0;
    for (let i = 0; i < pallets.length; i++) {
      totalWeight += pallets[i].totalWeight;
    }

    res.json({
      success: true,
      pallets: pallets,
      summary: {
        totalPallets: pallets.length,
        stores: uniqueStores,
        totalWeight: totalWeight
      }
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
