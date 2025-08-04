# Supply Chain Digital Twin (Palantir-style)

This project is a supply chain digital twin for a retailer, using an ontology-based graph model and a modern web UI. It is designed to be developed and previewed entirely in GitHub Codespaces, including from an iPad.

---

## 🚀 Quick Start (in Codespaces)

### 1. **Open in Codespaces**
- On GitHub, click the green **"<> Code"** button, then **"Codespaces"** tab, then **"Create codespace on main"**.

### 2. **Backend Setup**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn networkx pydantic
```

### 3. **Frontend Setup**
```bash
cd client
npm install
```

### 4. **Run the Backend**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. **Run the Frontend**
```bash
cd client
npm start
```

### 6. **Preview the App**
- In Codespaces, open the **PORTS** tab at the bottom.
- Click **"Open in Browser"** next to port 3000 (React) and 8000 (FastAPI) to preview.
- These are public URLs—open them in a new tab on your iPad for full-screen experience.

---

## 🧱 Project Structure

- `backend/` — FastAPI app, ontology, sample data, API
- `client/` — React app, graph visualization, UI

---

## 📝 Notes
- All development, preview, and testing is done in the browser (Codespaces).
- No need for localhost or tunnels.
- You get public URLs for both backend and frontend.
- Perfect for iPad-only development!

---

## 📦 Requirements
- GitHub account
- Codespaces access (free for most users)
- No local setup needed