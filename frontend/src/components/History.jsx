import { useState, useEffect } from "react";

export default function History({ realStations }) {
  const [history, setHistory] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [form, setForm] = useState({
    date: "", duration: "", cost: "",
    battery_before: 20, battery_after: 80
  });

  const mapStations = (realStations || []).map((s) => ({
    id: s.id, name: s.name,
    charger_type: s.is_fast ? "Fast" : "Slow",
  }));

  useEffect(() => {
    const saved = localStorage.getItem("ev_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (mapStations.length > 0 && !selectedStationId) {
      setSelectedStationId(String(mapStations[0].id));
    }
  }, [realStations]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSession = () => {
    if (!form.date || !form.duration || !form.cost) {
      alert("Please fill in date, duration and cost!"); return;
    }
    const station = mapStations.find((s) => String(s.id) === selectedStationId);
    const newEntry = {
      ...form, id: Date.now(),
      station_name: station?.name || "Unknown",
      charger_type: station?.charger_type || "Unknown",
    };
    const updated = [newEntry, ...history];
    setHistory(updated);
    localStorage.setItem("ev_history", JSON.stringify(updated));
    setForm({ date: "", duration: "", cost: "", battery_before: 20, battery_after: 80 });
  };

  const deleteEntry = (id) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem("ev_history", JSON.stringify(updated));
  };

  const totalCost = history.reduce((sum, h) => sum + parseFloat(h.cost || 0), 0).toFixed(2);
  const totalSessions = history.length;

  if (mapStations.length === 0) {
    return (
      <div className="panel">
        <h2>📋 Charging History</h2>
        <p className="panel-sub">Track all your past charging sessions</p>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 32, textAlign: "center"
        }}>
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>📋</p>
          <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>No stations found yet.</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Go to <strong>🗺️ Map</strong> tab and search a city first.
          </p>
        </div>
        {/* Still show existing history even without stations */}
        {history.length > 0 && (
          <div className="reviews-list" style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 12, color: "var(--text-secondary)" }}>
              📋 Past Sessions
            </h3>
            {history.map((h) => (
              <div key={h.id} className="review-card">
                <div className="review-header">
                  <strong>{h.station_name}</strong>
                  <button onClick={() => deleteEntry(h.id)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                    🗑️
                  </button>
                </div>
                <div className="rec-details" style={{ margin: "8px 0" }}>
                  <span>📅 {new Date(h.date).toLocaleString()}</span>
                  <span>⏱️ {h.duration} min</span>
                  <span>💸 ₹{h.cost}</span>
                  <span className={`badge ${h.charger_type === "Fast" ? "badge-fast" : "badge-slow"}`}>
                    {h.charger_type === "Fast" ? "⚡ Fast" : "🔌 Slow"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>📋 Charging History</h2>
      <p className="panel-sub">
        Track all your past charging sessions — {mapStations.length} real station(s) available
      </p>

      {totalSessions > 0 && (
        <div className="history-summary">
          {[
            { icon: "🔋", value: totalSessions, label: "Sessions" },
            { icon: "💸", value: `₹${totalCost}`, label: "Total Spent" },
            { icon: "⚡", value: `₹${(totalCost / totalSessions || 0).toFixed(0)}`, label: "Avg Cost" },
          ].map((c) => (
            <div key={c.label} className="history-stat">
              <span style={{ fontSize: "1.4rem" }}>{c.icon}</span>
              <strong>{c.value}</strong>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="review-form">
        <h3>➕ Log New Session</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Station</label>
            <select value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}>
              {mapStations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Date & Time</label>
            <input type="datetime-local" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={{ background: "var(--bg-deep)", border: "1px solid var(--border)",
                color: "var(--text-primary)", padding: "8px 12px", borderRadius: "8px", fontSize: "0.9rem" }} />
          </div>
          <div className="form-group">
            <label>Duration (minutes)</label>
            <input type="number" placeholder="e.g. 45" value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              style={{ background: "var(--bg-deep)", border: "1px solid var(--border)",
                color: "var(--text-primary)", padding: "8px 12px", borderRadius: "8px", fontSize: "0.9rem" }} />
          </div>
          <div className="form-group">
            <label>Cost Paid (₹)</label>
            <input type="number" placeholder="e.g. 120" value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              style={{ background: "var(--bg-deep)", border: "1px solid var(--border)",
                color: "var(--text-primary)", padding: "8px 12px", borderRadius: "8px", fontSize: "0.9rem" }} />
          </div>
          <div className="form-group">
            <label>Battery Before: <strong style={{ color: "#f59e0b" }}>{form.battery_before}%</strong></label>
            <input type="range" min="1" max="99" value={form.battery_before}
              onChange={(e) => setForm({ ...form, battery_before: parseInt(e.target.value) })} />
          </div>
          <div className="form-group">
            <label>Battery After: <strong style={{ color: "#22c55e" }}>{form.battery_after}%</strong></label>
            <input type="range" min="2" max="100" value={form.battery_after}
              onChange={(e) => setForm({ ...form, battery_after: parseInt(e.target.value) })} />
          </div>
        </div>
        <button className="btn-primary" onClick={saveSession}>📋 Save Session</button>
      </div>

      <div className="reviews-list">
        {history.length === 0 && <p className="no-result">No sessions logged yet. Add your first one!</p>}
        {history.map((h) => (
          <div key={h.id} className="review-card">
            <div className="review-header">
              <strong>{h.station_name}</strong>
              <button onClick={() => deleteEntry(h.id)}
                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1rem" }}>
                🗑️
              </button>
            </div>
            <div className="rec-details" style={{ margin: "8px 0" }}>
              <span>📅 {new Date(h.date).toLocaleString()}</span>
              <span>⏱️ {h.duration} min</span>
              <span>💸 ₹{h.cost}</span>
              <span className={`badge ${h.charger_type === "Fast" ? "badge-fast" : "badge-slow"}`}>
                {h.charger_type === "Fast" ? "⚡ Fast" : "🔌 Slow"}
              </span>
            </div>
            <div className="battery-visual" style={{ marginTop: 8 }}>
              <div className="battery-bar" style={{ height: 10 }}>
                <div className="battery-current" style={{ width: `${h.battery_before}%` }} />
                <div className="battery-target" style={{ width: `${Math.max(0, h.battery_after - h.battery_before)}%` }} />
              </div>
              <div className="battery-labels">
                <span style={{ color: "#f59e0b" }}>Before: {h.battery_before}%</span>
                <span style={{ color: "#22c55e" }}>After: {h.battery_after}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}