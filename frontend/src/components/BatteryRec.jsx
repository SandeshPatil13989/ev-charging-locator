import { useState, useEffect } from "react";
import { getRecommendations } from "../api";

export default function BatteryRec({ realStations, userLocation }) {
  const [battery, setBattery] = useState(15);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationSource, setLocationSource] = useState("default");

  const searchLocation = userLocation || { lat: 12.2958, lng: 76.6394 };

  useEffect(() => {
    if (userLocation) setLocationSource("detected");
  }, [userLocation]);

  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const search = async () => {
    setLoading(true);
    if (realStations && realStations.length > 0 && userLocation) {
      const filtered = realStations
        .map((s) => ({
          ...s,
          distance_km: Math.round(calcDistance(userLocation.lat, userLocation.lng, s.lat, s.lng) * 100) / 100,
          charger_type: s.is_fast ? "Fast" : "Slow",
          total_slots: s.connectors || 2,
          cost_per_unit: s.is_fast ? 13 : 9,
        }))
        .filter((s) => s.distance_km <= battery)
        .sort((a, b) => a.distance_km - b.distance_km);
      setResults(filtered);
      setLocationSource("map");
    } else {
      try {
        const res = await getRecommendations(searchLocation.lat, searchLocation.lng, battery);
        setResults(res.data);
        setLocationSource(userLocation ? "detected" : "default");
      } catch {
        setResults([]);
      }
    }
    setLoading(false);
  };

  const getBatteryColor = () => {
    if (battery > 30) return "#22c55e";
    if (battery > 15) return "#f59e0b";
    return "#ef4444";
  };

  const getStatusColor = (status) => {
    if (status === "available") return "#22c55e";
    if (status === "busy") return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="panel">
      <h2>🔋 Battery-Aware Recommendations</h2>
      <p className="panel-sub">
        Find stations reachable with your current battery level
        {locationSource === "detected" && " — using your detected location"}
        {locationSource === "map" && " — using stations from your map search"}
        {locationSource === "default" && " — using Mysuru as default location"}
      </p>

      {/* Location indicator */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "10px 16px", marginBottom: 16,
        fontSize: "0.82rem", display: "flex", alignItems: "center",
        gap: 10, flexWrap: "wrap", fontFamily: "'JetBrains Mono', monospace"
      }}>
        <span>📍 Searching from:</span>
        <strong style={{ color: "var(--accent-cyan)" }}>
          {userLocation
            ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
            : "Mysuru City Center (default)"}
        </strong>
        {realStations && realStations.length > 0 && userLocation && (
          <span style={{ color: "var(--accent-green)" }}>
            ✅ {realStations.length} real stations available
          </span>
        )}
        {!userLocation && (
          <span style={{ color: "var(--accent-yellow)" }}>
            💡 Search a city in 🗺️ Map tab for real results
          </span>
        )}
      </div>

      {/* Battery slider */}
      <div className="form-group" style={{ marginBottom: 20 }}>
        <label style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Battery Range</span>
          <strong style={{ color: getBatteryColor(), fontFamily: "'JetBrains Mono', monospace" }}>
            {battery} km remaining
          </strong>
        </label>
        <input
          type="range" min="1" max="100" value={battery}
          onChange={(e) => setBattery(parseInt(e.target.value))}
        />
        <div className="battery-visual" style={{ marginTop: 8 }}>
          <div className="battery-bar">
            <div
              className="battery-current"
              style={{
                width: `${battery}%`,
                background: getBatteryColor(),
                transition: "width 0.3s, background 0.3s"
              }}
            />
          </div>
          <div className="battery-labels">
            <span style={{ color: "#ef4444" }}>0 km</span>
            <span style={{ color: getBatteryColor(), fontWeight: 600 }}>{battery} km</span>
            <span style={{ color: "#22c55e" }}>100 km</span>
          </div>
        </div>
      </div>

      {/* EV range presets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "🚗 City EV", km: 20 },
          { label: "🚙 Mid EV", km: 40 },
          { label: "🛻 Large EV", km: 60 },
          { label: "⚡ Premium", km: 80 },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => setBattery(preset.km)}
            style={{
              background: battery === preset.km ? "var(--accent-blue)" : "var(--bg-card)",
              border: `1px solid ${battery === preset.km ? "var(--accent-blue)" : "var(--border)"}`,
              color: battery === preset.km ? "white" : "var(--text-secondary)",
              padding: "5px 12px", borderRadius: 8, cursor: "pointer",
              fontSize: "0.78rem", fontFamily: "'Exo 2', sans-serif", transition: "all 0.2s",
            }}
          >
            {preset.label} ({preset.km}km)
          </button>
        ))}
      </div>

      <button className="btn-primary" onClick={search} disabled={loading}>
        {loading ? "⏳ Searching..." : "🔍 Find Reachable Stations"}
      </button>

      {/* Results count */}
      {results.length > 0 && (
        <div style={{
          marginBottom: 12, fontSize: "0.85rem", color: "var(--text-secondary)",
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          ✅ Found <strong style={{ color: "var(--accent-cyan)" }}>
            {results.length}
          </strong> reachable station(s) within {battery} km
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="rec-list">
          {results.map((s, i) => (
            <div key={s.id || i} className="rec-card">
              <div className="rec-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    background: "var(--bg-deep)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem",
                    color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    #{i + 1}
                  </span>
                  <strong style={{ fontSize: "0.95rem" }}>{s.name}</strong>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {s.status && (
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700,
                      color: getStatusColor(s.status),
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>
                      {s.status === "available" ? "🟢 Available"
                        : s.status === "busy" ? "🟡 Busy" : "🔴 Full"}
                    </span>
                  )}
                  <span className={`badge ${
                    (s.charger_type === "Fast" || s.is_fast) ? "badge-fast" : "badge-slow"
                  }`}>
                    {(s.charger_type === "Fast" || s.is_fast) ? "⚡ Fast" : "🔌 Slow"}
                  </span>
                </div>
              </div>

              <div className="rec-details">
                <span>📍 <strong style={{ color: "var(--accent-cyan)" }}>
                  {s.distance_km} km
                </strong> away</span>
                <span>🔌 {s.total_slots || s.connectors || "?"} slots</span>
                {s.cost_per_unit && <span>₹{s.cost_per_unit}/unit</span>}
                {s.max_power_kw > 0 && <span>⚡ {s.max_power_kw} kW</span>}
                {s.opening_hours && s.opening_hours !== "Unknown" && (
                  <span>🕐 {s.opening_hours}</span>
                )}
                {s.available_slots !== undefined && (
                  <span>🟢 {s.available_slots}/{s.total_slots} free</span>
                )}
              </div>

              {/* Distance progress bar */}
              <div style={{ marginTop: 10 }}>
                <div style={{
                  height: 4, background: "var(--bg-deep)",
                  borderRadius: 2, overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min((s.distance_km / battery) * 100, 100)}%`,
                    background: s.distance_km < battery * 0.3 ? "#22c55e"
                      : s.distance_km < battery * 0.7 ? "#f59e0b" : "#ef4444",
                    borderRadius: 2, transition: "width 0.5s ease"
                  }} />
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: "0.68rem", color: "var(--text-muted)",
                  marginTop: 3, fontFamily: "'JetBrains Mono', monospace"
                }}>
                  <span>0 km</span>
                  <span>{s.distance_km} km / {battery} km range</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="no-result">
          <p style={{ fontSize: "1.5rem", marginBottom: 8 }}>🔋</p>
          <p>No stations found within {battery} km range.</p>
          <p style={{ fontSize: "0.82rem", marginTop: 6, color: "var(--text-muted)" }}>
            Try increasing your battery range or search a city in the 🗺️ Map tab first.
          </p>
        </div>
      )}
    </div>
  );
}