import { useState, useEffect } from "react";

export default function CostEstimator({ realStations, userLocation }) {
  const [form, setForm] = useState({
    battery_percent: 20,
    target_percent: 80,
    capacity_kwh: 40,
  });
  const [selectedStation, setSelectedStation] = useState(null);
  const [result, setResult] = useState(null);

  const mapStations = (realStations || []).map((s) => ({
    id: s.id, name: s.name,
    charger_type: s.is_fast ? "Fast" : "Slow",
    cost_per_unit: s.is_fast ? 13 : 9,
    total_slots: s.connectors || 2,
    distance_km: userLocation ? (() => {
      const R = 6371;
      const dLat = ((s.lat - userLocation.lat) * Math.PI) / 180;
      const dLng = ((s.lng - userLocation.lng) * Math.PI) / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(userLocation.lat*Math.PI/180)*Math.cos(s.lat*Math.PI/180)*Math.sin(dLng/2)**2;
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 100) / 100;
    })() : null,
  }));

  useEffect(() => {
    if (mapStations.length > 0) setSelectedStation(mapStations[0]);
  }, [realStations]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimate = () => {
    if (!selectedStation) return;
    if (form.target_percent <= form.battery_percent) {
      alert("Target % must be greater than current battery %"); return;
    }
    const energy = ((form.target_percent - form.battery_percent) / 100) * form.capacity_kwh;
    const cost = Math.round(energy * selectedStation.cost_per_unit * 100) / 100;
    const time = Math.round((energy / (selectedStation.charger_type === "Fast" ? 7.2 : 2.4)) * 60 * 10) / 10;
    setResult({
      energy_kwh: Math.round(energy * 100) / 100,
      cost_inr: cost, time_minutes: time,
      charger_type: selectedStation.charger_type,
      cost_per_unit: selectedStation.cost_per_unit,
    });
  };

  if (mapStations.length === 0) {
    return (
      <div className="panel">
        <h2>💰 Charging Cost Estimator</h2>
        <p className="panel-sub">Calculate exact cost, energy and time to charge your EV</p>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 32, textAlign: "center"
        }}>
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>💰</p>
          <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>No stations found yet.</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Go to <strong>🗺️ Map</strong> tab and search a city first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>💰 Charging Cost Estimator</h2>
      <p className="panel-sub">
        Calculate exact cost, energy and time — {mapStations.length} real station(s) available
      </p>

      <div className="form-grid">
        <div className="form-group">
          <label>Charging Station</label>
          <select onChange={(e) => {
            const s = mapStations.find((s) => String(s.id) === e.target.value);
            if (s) { setSelectedStation(s); setResult(null); }
          }} value={selectedStation?.id || ""}>
            {mapStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.distance_km ? ` (${s.distance_km}km)` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Vehicle Battery Capacity (kWh)</label>
          <select onChange={(e) => setForm({ ...form, capacity_kwh: parseFloat(e.target.value) })}>
            <option value={30}>30 kWh — Small EV</option>
            <option value={40}>40 kWh — Mid EV</option>
            <option value={60}>60 kWh — Large EV</option>
            <option value={75}>75 kWh — Tesla Model 3</option>
            <option value={100}>100 kWh — Premium EV</option>
          </select>
        </div>

        <div className="form-group">
          <label>Current Battery: <strong style={{ color: "#f59e0b" }}>{form.battery_percent}%</strong></label>
          <input type="range" min="1" max="99" value={form.battery_percent}
            onChange={(e) => { setForm({ ...form, battery_percent: parseFloat(e.target.value) }); setResult(null); }} />
        </div>

        <div className="form-group">
          <label>Target Battery: <strong style={{ color: "#22c55e" }}>{form.target_percent}%</strong></label>
          <input type="range" min="2" max="100" value={form.target_percent}
            onChange={(e) => { setForm({ ...form, target_percent: parseFloat(e.target.value) }); setResult(null); }} />
        </div>
      </div>

      {selectedStation && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 16px", marginBottom: 16,
          fontSize: "0.82rem", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap"
        }}>
          <span style={{ color: "var(--text-secondary)" }}>⚡ Station:</span>
          <strong style={{ color: "var(--accent-cyan)" }}>{selectedStation.name}</strong>
          <span className={`badge ${selectedStation.charger_type === "Fast" ? "badge-fast" : "badge-slow"}`}>
            {selectedStation.charger_type === "Fast" ? "⚡ Fast" : "🔌 Slow"}
          </span>
          <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            ₹{selectedStation.cost_per_unit}/unit
          </span>
          {selectedStation.distance_km && (
            <span style={{ color: "var(--accent-cyan)", fontFamily: "'JetBrains Mono', monospace" }}>
              📍 {selectedStation.distance_km} km away
            </span>
          )}
        </div>
      )}

      <div className="battery-visual">
        <div className="battery-bar">
          <div className="battery-current" style={{ width: `${form.battery_percent}%` }} />
          <div className="battery-target" style={{ width: `${Math.max(0, form.target_percent - form.battery_percent)}%` }} />
        </div>
        <div className="battery-labels">
          <span style={{ color: "#f59e0b" }}>⚡ Current: {form.battery_percent}%</span>
          <span style={{ color: "#22c55e" }}>🎯 Target: {form.target_percent}%</span>
          <span style={{ color: "var(--text-muted)" }}>+{Math.max(0, form.target_percent - form.battery_percent)}% needed</span>
        </div>
      </div>

      <button className="btn-primary" onClick={estimate}>💰 Estimate Cost</button>

      {result && (
        <div className="cost-result">
          {[
            { icon: "💸", value: `₹${result.cost_inr}`, label: "Total Cost" },
            { icon: "⚡", value: `${result.energy_kwh} kWh`, label: "Energy Needed" },
            { icon: "⏱️", value: `${result.time_minutes} min`, label: `Est. Time (${result.charger_type})` },
            { icon: "🔌", value: `₹${result.cost_per_unit}/unit`, label: "Rate" },
          ].map((c) => (
            <div key={c.label} className="cost-card">
              <span className="cost-icon">{c.icon}</span>
              <span className="cost-value">{c.value}</span>
              <span className="cost-label">{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}