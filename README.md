# 🏭 Supply Chain Digital Twin

A modern, ontology-based supply chain digital twin for retail companies (like Kroger or Tractor Supply), inspired by Palantir's approach. This project visualizes supply chain entities as an interactive graph with realistic sample data.

## 🚀 Features

- **Ontology-based Graph Model**: 10 node types (Distribution Centers, Stores, SKUs, Trucks, etc.)
- **Interactive Visualization**: Click nodes/edges to see details
- **Realistic Sample Data**: 16 DCs, 200 stores, 500 SKUs, 40 trucks, etc.
- **Touch-Friendly UI**: Optimized for iPad and mobile devices
- **Real-time API**: FastAPI backend with CORS support
- **Responsive Design**: Works on desktop, tablet, and mobile

## 📊 Supply Chain Entities

### Node Types
- **DistributionCenter**: DCs that supply stores
- **Store**: Retail locations (urban/rural)
- **SKU**: Products with categories and temperature zones
- **Truck**: Delivery vehicles with routes and status
- **PurchaseOrder**: Store orders with delivery windows
- **Shipment**: Freight with carriers and ETAs
- **InventorySnapshot**: Current stock levels
- **Return**: Customer returns and damaged goods
- **WeatherAlert**: Weather events affecting operations
- **Event**: Disruptions and incidents

### Relationships
- DCs supply stores and ship trucks
- Trucks carry shipments containing SKUs
- Shipments deliver to stores
- Stores order POs fulfilled by shipments
- Weather alerts impact DCs and trucks
- Events are associated with trucks and POs

## 🛠️ Quick Start

### Option 1: GitHub Codespaces (Recommended for iPad)

1. **Open in Codespaces**
   - Go to your GitHub repo
   - Click green "<> Code" button → "Codespaces" tab
   - Click "Create codespace on main"

2. **Backend Setup**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd client
   npm install
   ```

4. **Run Backend**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Run Frontend**
   ```bash
   cd client
   npm start
   ```

6. **Preview**
   - In Codespaces, open the **PORTS** tab
   - Click "Open in Browser" for ports 3000 (React) and 8000 (FastAPI)
   - Open these URLs in your iPad browser

### Option 2: Local Development

1. **Clone and Setup**
   ```bash
   git clone <your-repo-url>
   cd supply-chain-digital-twin
   ```

2. **Backend**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend**
   ```bash
   cd client
   npm install
   npm start
   ```

4. **Access**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🚀 Deployment

### Render (Recommended)

**Backend Deployment:**
1. Go to [Render.com](https://render.com)
2. Create new **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
   - **Environment**: Python 3.11+

**Frontend Deployment:**
1. Create another **Web Service**
2. Settings:
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build -l 3000`
   - **Environment**: Node 18+

### Other Platforms
- **Vercel**: Frontend deployment
- **Railway**: Full-stack deployment
- **Heroku**: Both frontend and backend
- **AWS/GCP**: Enterprise deployment

## 📁 Project Structure

```
supply-chain-digital-twin/
├── backend/
│   ├── main.py              # FastAPI app with ontology & API
│   └── requirements.txt     # Python dependencies
├── client/
│   ├── package.json         # React dependencies
│   ├── public/              # Static assets
│   └── src/
│       ├── App.js           # Main React app with graph
│       ├── index.js         # React entry point
│       └── index.css        # Styles
├── README.md                # This file
└── .gitignore              # Git ignore rules
```

## 🔧 API Endpoints

- `GET /` - API info
- `GET /nodes` - All nodes (optional `?type=Store`)
- `GET /edges` - All edges (optional `?type=SUPPLIES`)
- `GET /node/{id}` - Specific node details
- `GET /neighbors/{id}` - Node neighbors
- `GET /stats` - Graph statistics

## 🎨 UI Features

- **Interactive Graph**: Click nodes/edges for details
- **Responsive Design**: Works on iPad, mobile, desktop
- **Color-coded Nodes**: Different colors for each entity type
- **Stats Dashboard**: Real-time graph statistics
- **Touch-friendly**: Optimized for tablet interaction

## 🔮 Future Enhancements

- **LLM Integration**: Chat interface for supply chain insights
- **Real-time Updates**: WebSocket connections for live data
- **Advanced Filtering**: Filter by region, status, date ranges
- **Export Features**: PDF reports, data export
- **Alert System**: Real-time notifications for disruptions

## 📝 Development Notes

- **Backend**: FastAPI with NetworkX for graph operations
- **Frontend**: React with Cytoscape.js for visualization
- **Data**: Realistic sample data generated on startup
- **CORS**: Configured for cross-origin requests
- **Mobile**: Touch-optimized with responsive design

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use for commercial projects.

---

**Perfect for iPad development and deployment!** 🚀