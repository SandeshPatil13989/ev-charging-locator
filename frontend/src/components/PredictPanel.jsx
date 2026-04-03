import { useState, useEffect } from "react";
import { predictAvailability } from "../api";

export default function PredictPanel({ stations, realStations }) {
  const [form, setForm] = useState({
    station_id: null,
    hour: 9,
    day_of_week: 0,
    charger_type: 1,
    total_slots: 5,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState("");

  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const mapStations = (realStations || []).map((s) => ({
    id: s.id,
    name: s.name,
    charger_type: s.is_fast ? 1 : 0,
    total_slots: s.connectors || 2,
  }));

  useEffect(() => {
    if (mapStations.length > 0) {
      const first = mapStations[0];
      setForm((f) => ({
        ...f,
        station_id: first.id,
        charger_type: first.charger_type,
        total_slots: first.total_slots,
      }));
      setSelectedName(first.name);
    }
  }, [realStations]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStationChange = (e) => {
    const selected = mapStations.find((s) => String(s.id) === e.target.value);
    if (selected) {
      setForm({
        ...form,
        station_id: selected.id,
        charger_type: selected.charger_type,
        total_slots: selected.total_slots,
      });
      setSelectedName(selected.name);
      setResult(null);
    }
  };

  const predict = async () => {
    if (!form.station_id) return;
    setLoading(true);
    try {
      const predictForm = { ...form, station_id: 1 };
      const res = await predictAvailability(predictForm);
      setResult(res.data);
    } catch {
      setResult(null);
    }
    setLoading(false);
  };

  const getHourLabel = (h) => {
    if ([8,9,10,17,18,19,20].includes(h)) return "🔴 Peak hour";
    if (h >= 22 || h <= 5) return "🌙 Night hours";
    return "🟢 Off-peak";
  };

  if (mapStations.length === 0) {
    return (
      <div className="panel">
        <h2>🧠 AI Availability Predictor</h2>
        <p className="panel-sub">Predict if a station will be available at a given time</p>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 32, textAlign: "center"
        }}>
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>🗺️</p>
          <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
            No stations found yet.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Go to the <strong>🗺️ Map</strong> tab and search for a city to find real EV stations near you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>🧠 AI Availability Predictor</h2>
      <p className="panel-sub">
        Predict if a station will be available at a given time —
        {mapStations.length} real station(s) available
      </p>

      <div className="form-grid">
        <div className="form-group">
          <label>Charging Station</label>
          <select onChange={handleStationChange} value={form.station_id || ""}>
            {mapStations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Hour of Day: {form.hour}:00</label>
          <input type="range" min="0" max="23" value={form.hour}
            onChange={(e) => setForm({ ...form, hour: parseInt(e.target.value) })} />
          <span style={{
            fontSize: "0.75rem", color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {getHourLabel(form.hour)}
          </span>
        </div>

        <div className="form-group">
          <label>Day of Week</label>
          <select onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
            value={form.day_of_week}>
            {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
      </div>

      {selectedName && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 16px", marginBottom: 16,
          fontSize: "0.85rem", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap"
        }}>
          <span style={{ color: "var(--text-secondary)" }}>📍 Selected:</span>
          <strong style={{ color: "var(--accent-cyan)" }}>{selectedName}</strong>
          <span className={`badge ${form.charger_type === 1 ? "badge-fast" : "badge-slow"}`}>
            {form.charger_type === 1 ? "⚡ Fast" : "🔌 Slow"}
          </span>
          <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            {form.total_slots} slots
          </span>
        </div>
      )}

      <button className="btn-primary" onClick={predict} disabled={loading || !form.station_id}>
        {loading ? "⏳ Predicting..." : "⚡ Predict Availability"}
      </button>

      {result && (
        <div className={`result-box ${result.available ? "available" : "unavailable"}`}>
          <span className="result-icon">{result.available ? "✅" : "❌"}</span>
          <div>
            <strong style={{ fontSize: "1.05rem" }}>
              {result.available ? "Station Likely Available!" : "Station Likely Busy"}
            </strong>
            <p>
              Availability Probability:{" "}
              <strong style={{ color: result.available ? "#22c55e" : "#ef4444" }}>
                {(result.probability * 100).toFixed(0)}%
              </strong>
            </p>
            <p style={{ marginTop: 4, fontSize: "0.85rem" }}>
              ⏰ {form.hour}:00 — {days[form.day_of_week]} —{" "}
              <span style={{ color: "var(--accent-cyan)" }}>{selectedName}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}