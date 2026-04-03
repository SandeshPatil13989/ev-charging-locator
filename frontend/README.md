# ⚡ EV Charging Station Locator

<div align="center">

![EV Charging Locator](https://img.shields.io/badge/EV-Charging%20Locator-blue?style=for-the-badge&logo=lightning&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-87.3%25-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

### AI-Powered Smart EV Charging Station Finder for India
### 🎓 Final Year B.E. Project — Computer Science & Engineering — 2025-26

[🌐 Live Demo](https://ev-charging-locator.vercel.app) • [📄 API Docs](https://ev-charging-api-8nph.onrender.com/docs) • [🐛 Report Bug](https://github.com/SandeshPatil13989/ev-charging-locator/issues)

</div>

---

## 📸 Screenshots

| Map View | ML Dashboard | AI Chat |
|---|---|---|
| Real EV stations across India | 5 interactive chart types | Context-aware AI assistant |

---

## ✨ Features

- 🗺️ **Real-time Map** — Real EV stations across all India via OpenStreetMap Overpass API
- 🧠 **AI Prediction** — XGBoost model with **87.3% accuracy** predicts station availability
- 🛣️ **Route Optimizer** — Dijkstra's algorithm for shortest path between stations
- 🔋 **Battery-Aware** — Haversine formula filters only reachable stations by battery range
- ⚡ **Live Updates** — WebSocket updates station availability every 15 seconds
- 💰 **Cost Estimator** — Calculates exact cost (₹), energy (kWh) and time (min)
- 📊 **ML Dashboard** — 5 interactive charts (Line, Bar, Pie, Radar, Horizontal Bar)
- 🤖 **AI Chatbot** — Context-aware assistant with live station data
- ⭐ **Reviews** — Community ratings and feedback system
- 📋 **History** — Session tracker with battery visualization
- 📱 **PWA** — Installable as native mobile app

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js 18, Leaflet.js, Recharts, Socket.IO Client |
| **Backend** | FastAPI, Python-SocketIO, Uvicorn |
| **ML Model** | XGBoost, Scikit-learn, Pandas, NumPy |
| **Map Data** | OpenStreetMap Overpass API, Nominatim |
| **Routing** | Leaflet Routing Machine, Dijkstra's Algorithm |
| **Real-time** | WebSocket (Socket.IO) |
| **Deployment** | Vercel (Frontend) + Render (Backend) |

---

## 📊 ML Model Details

```
Algorithm:        XGBoost Classifier
Accuracy:         87.3% (Target: ≥85%) ✅
Training Samples: 80,640
Features:         10 engineered features
```

### Features Used
| Feature | Importance |
|---|---|
| Hour of Day | 32% |
| Is Peak Hour | 24% |
| Is Night | 15% |
| Is Evening | 10% |
| Charger Type | 8% |
| Is Morning | 6% |
| Is Weekend | 3% |
| Total Slots | 2% |

### Experiments Conducted
- ✅ GridSearchCV — 768 parameter combinations
- ✅ LightGBM — 87.35%
- ✅ RF + XGBoost + LightGBM Ensemble — 87.29%
- ✅ All converged to **87.3%** — confirmed optimal for synthetic data

---

## 🗂️ Project Structure

```
ev-charging-locator/
├── backend/
│   ├── main.py              # FastAPI — 11 routes + WebSocket
│   ├── model.py             # XGBoost training script
│   ├── data_generator.py    # 80,640 sample generator
│   ├── dijkstra.py          # Shortest path algorithm
│   ├── stations.json        # 8 local Mysuru stations
│   ├── model.pkl            # Trained XGBoost model
│   └── requirements.txt     # Python dependencies
└── frontend/
    └── src/
        ├── App.jsx           # Main app + routing
        ├── App.css           # Global styles
        ├── api.js            # API calls
        ├── socket.js         # WebSocket connection
        └── components/
            ├── Map.jsx        # Interactive map
            ├── Dashboard.jsx  # Stats dashboard
            ├── PredictPanel.jsx
            ├── RoutePanel.jsx
            ├── BatteryRec.jsx
            ├── CostEstimator.jsx
            ├── Reviews.jsx
            ├── History.jsx
            ├── MLDashboard.jsx
            └── Chatbot.jsx
```

---

## ⚙️ API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/stations` | All stations + live availability |
| POST | `/predict` | AI availability prediction |
| POST | `/route` | Dijkstra shortest path |
| POST | `/recommend` | Battery-aware recommendations |
| GET | `/analytics` | Hourly demand patterns |
| POST | `/estimate` | Cost + time estimation |
| POST | `/review` | Submit station review |
| GET | `/reviews/{id}` | Get station reviews |
| POST | `/nearby-stations` | Real stations via Overpass API |
| GET | `/ml-stats` | ML model metrics |
| WS | `socket.io` | Live availability updates |

---

## 🏃 Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
python model.py              # Train the model
python main.py               # Start FastAPI server
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Access
- 🌐 Frontend: `http://localhost:3000`
- ⚙️ Backend: `http://localhost:5000`
- 📄 API Docs: `http://localhost:5000/docs`

---

## 🌐 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://ev-charging-locator.vercel.app |
| Backend | Render | https://ev-charging-api-8nph.onrender.com |

> **Note:** Render free tier sleeps after 15 min inactivity. First request may take 30-50 seconds to wake up.

---

## 📱 PWA Installation

1. Open the live URL on Chrome mobile
2. Tap **3 dots menu** (⋮)
3. Tap **"Add to Home Screen"**
4. Done — works like a native app! ⚡

---

## 🎯 Results

| Objective | Target | Achieved | Status |
|---|---|---|---|
| ML Accuracy | ≥ 85% | 87.3% | ✅ Exceeded |
| Real Station Coverage | India-wide | All cities via OSM | ✅ |
| Real-time Updates | Live | Every 15 seconds | ✅ |
| Route Optimization | Shortest path | Dijkstra + Turn-by-turn | ✅ |
| Battery Recommendations | Range filter | Haversine distance | ✅ |
| Cost Estimation | Accurate | kWh + INR + Time | ✅ |
| Mobile PWA | Installable | Chrome PWA | ✅ |

---

## 🔮 Future Enhancements

- [ ] Real IoT sensor data integration
- [ ] Slot pre-booking and reservation
- [ ] Payment gateway integration
- [ ] Native Android/iOS app
- [ ] Multi-language support (Hindi, Kannada)
- [ ] Live traffic integration for routing
- [ ] User authentication with JWT

---

## 👨‍💻 Developer

**Sandesh Roshan Patil**
Final Year B.E. — Computer Science & Engineering
2025-2026

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org/) — Map data via Overpass API
- [XGBoost](https://xgboost.readthedocs.io/) — ML framework
- [FastAPI](https://fastapi.tiangolo.com/) — Backend framework
- [React](https://react.dev/) — Frontend framework
- [Leaflet.js](https://leafletjs.com/) — Interactive maps
- [Vercel](https://vercel.com/) — Frontend hosting
- [Render](https://render.com/) — Backend hosting

---

<div align="center">

⭐ **Star this repo if you found it helpful!** ⭐

Made with ❤️ for Final Year Project 2025-26

</div>
