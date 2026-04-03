import { useState, useEffect } from "react";
import Map from "./components/Map";
import Dashboard from "./components/Dashboard";
import PredictPanel from "./components/PredictPanel";
import RoutePanel from "./components/RoutePanel";
import BatteryRec from "./components/BatteryRec";
import CostEstimator from "./components/CostEstimator";
import Reviews from "./components/Reviews";
import History from "./components/History";
import MLDashboard from "./components/MLDashboard";
import Chatbot from "./components/Chatbot";
import { getStations, getAnalytics } from "./api";
import { socket } from "./socket";
import "./App.css";

export default function App() {
  const [stations, setStations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("map");
  const [availability, setAvailability] = useState({});
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [realStations, setRealStations] = useState([]);
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("ev_user_location");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    getStations().then((r) => setStations(r.data));
    getAnalytics().then((r) => setAnalytics(r.data));

    socket.on("connect", () => setLiveUpdate(true));
    socket.on("disconnect", () => setLiveUpdate(false));
    socket.on("availability_update", (data) => {
      const map = {};
      data.stations.forEach((s) => { map[s.station_id] = s; });
      setAvailability(map);
    });

    return () => {
      socket.off("availability_update");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  const tabs = [
    { id: "map", label: "🗺️ Map" },
    { id: "predict", label: "🧠 AI Predict" },
    { id: "route", label: "🛣️ Route" },
    { id: "battery", label: "🔋 Battery" },
    { id: "cost", label: "💰 Cost" },
    { id: "reviews", label: "⭐ Reviews" },
    { id: "history", label: "📋 History" },
    { id: "ml", label: "📊 ML Dashboard" },
    { id: "chat", label: "🤖 AI Chat" },
    { id: "analytics", label: "📈 Analytics" },
  ];

  return (
    <div className="app">

      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="header-content">
          <h1>⚡ EV Charging Locator</h1>
          <p>AI-Powered Smart Charging Station Finder — India</p>
        </div>
        <div className="live-badge">
          <span className={`live-dot ${liveUpdate ? "live" : "offline"}`}></span>
          {liveUpdate ? "🔴 Live" : "⚫ Offline"}
        </div>
      </header>

      {/* ===== TICKER — Only real stations ===== */}
      {realStations.length > 0 && (
        <div className="availability-ticker">
          {realStations.map((s) => (
            <span key={s.id} className="ticker-item status-available">
              {s.is_fast ? "⚡" : "🔌"} {s.name}
              {s.max_power_kw > 0 ? ` · ${s.max_power_kw}kW` : ""}
              {s.connectors ? ` · ${s.connectors} port(s)` : ""}
              {" 🟢"}
            </span>
          ))}
          {Object.entries(availability).map(([id, a]) => {
            const s = stations.find((st) => String(st.id) === id);
            if (!s) return null;
            return (
              <span key={`live-${id}`} className={`ticker-item status-${a.status}`}>
                {s.name.replace("EV Station ", "")}:{" "}
                {a.available_slots}/{a.total_slots} slots
                {a.status === "full" ? " 🔴" : a.status === "busy" ? " 🟡" : " 🟢"}
              </span>
            );
          })}
        </div>
      )}

      {/* ===== DASHBOARD ===== */}
      {analytics && (
        <Dashboard
          analytics={analytics}
          availability={availability}
          stations={stations}
          realStations={realStations}
        />
      )}

      {/* ===== TABS ===== */}
      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="content">

        {/* 🗺️ MAP — Always mounted, hidden when not active */}
        <div style={{ display: activeTab === "map" ? "block" : "none" }}>
          <Map
            stations={stations}
            availability={availability}
            onRealStationsFound={setRealStations}
            onUserLocationChange={setUserLocation}
          />
        </div>

        {/* 🧠 AI PREDICT */}
        {activeTab === "predict" && (
          <PredictPanel
            stations={stations}
            realStations={realStations}
          />
        )}

        {/* 🛣️ ROUTE */}
        {activeTab === "route" && (
          <RoutePanel realStations={realStations} />
        )}

        {/* 🔋 BATTERY */}
        {activeTab === "battery" && (
          <BatteryRec
            realStations={realStations}
            userLocation={userLocation}
          />
        )}

        {/* 💰 COST */}
        {activeTab === "cost" && (
          <CostEstimator
            realStations={realStations}
            userLocation={userLocation}
          />
        )}

        {/* ⭐ REVIEWS */}
        {activeTab === "reviews" && (
          <Reviews realStations={realStations} />
        )}

        {/* 📋 HISTORY */}
        {activeTab === "history" && (
          <History realStations={realStations} />
        )}

        {/* 📊 ML DASHBOARD */}
        {activeTab === "ml" && (
          <MLDashboard realStations={realStations} />
        )}

        {/* 🤖 AI CHAT */}
        {activeTab === "chat" && <Chatbot />}

        {/* 📈 ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="analytics-wrap">
            <h2>📈 Hourly Demand Pattern</h2>
            <p style={{
              color: "var(--text-secondary)",
              marginBottom: 16,
              fontSize: "0.88rem"
            }}>
              Peak hours: 8-10 AM and 5-8 PM — Plan your charging accordingly
              {realStations.length > 0 &&
                ` | ${realStations.length} real stations tracked`}
            </p>

            {/* Demand bar chart */}
            {analytics && (
              <div className="demand-grid">
                {analytics.hourly_demand.map((h) => (
                  <div key={h.hour} className="demand-bar-wrap">
                    <div className="demand-bar" style={{
                      height: `${h.demand}%`,
                      background: h.demand >= 80 ? "#ef4444"
                        : h.demand >= 40 ? "#f59e0b" : "#22c55e",
                    }} />
                    <span className="demand-label">{h.hour}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Real stations cards */}
            {realStations.length > 0 && (
              <>
                <h3 style={{
                  marginTop: 28, marginBottom: 14,
                  fontSize: "1rem", color: "var(--text-secondary)"
                }}>
                  🗺️ Real EV Stations ({realStations.length} found)
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12
                }}>
                  {realStations.map((s) => (
                    <div key={s.id} style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10, padding: 14
                    }}>
                      <div style={{
                        fontSize: "0.85rem", fontWeight: 700,
                        marginBottom: 8, color: "var(--text-primary)"
                      }}>
                        {s.name}
                      </div>
                      <div style={{
                        display: "flex", gap: 6,
                        flexWrap: "wrap", marginBottom: 8
                      }}>
                        <span className={`badge ${s.is_fast ? "badge-fast" : "badge-slow"}`}>
                          {s.is_fast ? "⚡ Fast" : "🔌 Slow"}
                        </span>
                        <span className="badge" style={{
                          background: "rgba(34,197,94,0.1)",
                          color: "#4ade80",
                          border: "1px solid rgba(34,197,94,0.3)"
                        }}>
                          🟢 Available
                        </span>
                      </div>
                      <div style={{
                        fontSize: "0.75rem", color: "var(--text-muted)",
                        fontFamily: "'JetBrains Mono', monospace",
                        display: "flex", flexDirection: "column", gap: 2
                      }}>
                        {s.max_power_kw > 0 && <span>⚡ {s.max_power_kw} kW</span>}
                        <span>🔌 {s.connectors} connector(s)</span>
                        {s.network !== "Unknown" && <span>🌐 {s.network}</span>}
                        {s.fee !== "unknown" && <span>💰 Fee: {s.fee}</span>}
                        {s.opening_hours !== "Unknown" && (
                          <span>🕐 {s.opening_hours}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Empty state */}
            {realStations.length === 0 && (
              <div style={{
                marginTop: 24, background: "var(--bg-card)",
                border: "1px solid var(--border)", borderRadius: 12,
                padding: 32, textAlign: "center"
              }}>
                <p style={{ fontSize: "2rem", marginBottom: 12 }}>🗺️</p>
                <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
                  No real stations tracked yet.
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Go to <strong>🗺️ Map</strong> tab and search a city to see live data here.
                </p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}