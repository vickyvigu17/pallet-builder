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
  contentSecurityPolicy: false, // Disable for development
}));
app.use(cors());
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/build');
  
  // Check if build directory exists
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    console.log('✅ Serving React build from:', buildPath);
  } else {
    console.log('⚠️ Build directory not found, serving API only');
  }
}

// System prompt for AI-driven pallet building
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

// [Include all the PalletBuilder class code from before - same as previous upload]

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    buildExists: fs.existsSync(path.join(__dirname, '../client/build'))
  });
});

// [Include all other routes - same as before]

// Serve React app for any non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../client/build/index.html');
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback if build doesn't exist
      res.json({
        message: 'Pallet Builder API is running',
        api: {
          health: '/api/health',
          buildPallets: '/api/build-pallets',
          systemPrompt: '/api/system-prompt'
        },
        note: 'Frontend build not found. Use API endpoints directly.'
      });
    }
  });
}

// [Rest of the code same as before]
- List of SKUs and quantities (cases or eaches)
- Total Weight
- Special Instructions
`;

// Pallet building algorithm
class PalletBuilder {
  constructor() {
    this.MAX_WEIGHT = 1000; // kg
    this.MAX_HEIGHT = 7; // layers
  }

  buildPallets(orderLines) {
    const pallets = [];
    const storeGroups = this.groupByStore(orderLines);

    for (const [store, items] of Object.entries(storeGroups)) {
      const storePallets = this.buildStorePallets(store, items);
      pallets.push(...storePallets);
    }

    return pallets;
  }

  groupByStore(orderLines) {
    return orderLines.reduce((groups, item) => {
      if (!groups[item.store]) {
        groups[item.store] = [];
      }
      groups[item.store].push(item);
      return groups;
    }, {});
  }

  buildStorePallets(store, items) {
    const pallets = [];
    
    // Separate frozen from non-frozen items
    const frozenItems = items.filter(item => item.category === 'frozen');
    const nonFrozenItems = items.filter(item => item.category !== 'frozen');

    // Build pallets for non-frozen items
    if (nonFrozenItems.length > 0) {
      pallets.push(...this.createPalletsForItems(store, nonFrozenItems, 'regular'));
    }

    // Build separate pallets for frozen items
    if (frozenItems.length > 0) {
      pallets.push(...this.createPalletsForItems(store, frozenItems, 'frozen'));
    }

    return pallets;
  }

  createPalletsForItems(store, items, type) {
    const pallets = [];
    let currentPallet = this.createNewPallet(store, type);
    
    // Sort items: heavy/stable items first, fragile/bottles last
    const sortedItems = this.sortItemsForPalletizing(items);

    for (const item of sortedItems) {
      // Check if item fits in current pallet
      if (this.canAddToPallet(currentPallet, item)) {
        this.addItemToPallet(currentPallet, item);
      } else {
        // Start new pallet
        pallets.push(currentPallet);
        currentPallet = this.createNewPallet(store, type);
        this.addItemToPallet(currentPallet, item);
      }
    }

    if (currentPallet.items.length > 0) {
      pallets.push(currentPallet);
    }

    return pallets;
  }

  sortItemsForPalletizing(items) {
    return items.sort((a, b) => {
      // Priority order: heavy/stable first, fragile/bottles last
      const aScore = this.getItemPriorityScore(a);
      const bScore = this.getItemPriorityScore(b);
      return aScore - bScore;
    });
  }

  getItemPriorityScore(item) {
    if (item.fragile || item.category === 'bottles') return 3; // Place on top
    if (item.weight > 20) return 1; // Heavy items on bottom
    return 2; // Medium priority
  }

  canAddToPallet(pallet, item) {
    const newWeight = pallet.totalWeight + (item.weight * item.quantity);
    const newHeight = pallet.currentHeight + this.calculateItemHeight(item);
    
    return newWeight <= this.MAX_WEIGHT && newHeight <= this.MAX_HEIGHT;
  }

  calculateItemHeight(item) {
    // Estimate height based on item type and quantity
    const baseHeight = item.height || 0.3; // 30cm default
    return Math.ceil(item.quantity / 4) * baseHeight; // 4 items per layer estimate
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
    
    // Update special instructions
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
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/build-pallets', (req, res) => {
  try {
    const { orderLines } = req.body;
    
    if (!orderLines || !Array.isArray(orderLines)) {
      return res.status(400).json({ error: 'Invalid order lines provided' });
    }

    const palletBuilder = new PalletBuilder();
    const pallets = palletBuilder.buildPallets(orderLines);

    res.json({
      success: true,
      pallets: pallets,
      summary: {
        totalPallets: pallets.length,
        stores: [...new Set(pallets.map(p => p.store))].length,
        totalWeight: pallets.reduce((sum, p) => sum + p.totalWeight, 0)
      }
    });
  } catch (error) {
    console.error('Error building pallets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/system-prompt', (req, res) => {
  res.json({ systemPrompt });
});

// Serve React app for any non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Pallet Builder API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
