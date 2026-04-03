import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import axios from "axios";

const BASE = "https://ev-charging-api-8nph.onrender.com";
const COLORS = ["#2563eb","#22c55e","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem" }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {p.value}{p.unit || ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MLDashboard({ realStations }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState("availability");
  const [error, setError] = useState(null);

  const loadStats = () => {
    setLoading(true);
    setError(null);
    axios.get(`${BASE}/ml-stats`)
      .then((r) => { setStats(r.data); setLoading(false); })
      .catch(() => { setError("Failed to load ML stats"); setLoading(false); });
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) return (
    <div className="ml-loading">
      <div className="ml-spinner"></div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        Loading ML Analytics...
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 8 }}>
        Backend waking up — please wait 30 seconds
      </p>
    </div>
  );

  if (error) return (
    <div className="ml-loading">
      <p style={{ fontSize: "2rem", marginBottom: 12 }}>📊</p>
      <p style={{ color: "var(--accent-red)", marginBottom: 8 }}>❌ {error}</p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 16 }}>
        Backend may still be waking up — wait 30 seconds and retry
      </p>
      <button className="btn-primary" onClick={loadStats}>
        🔄 Retry
      </button>
    </div>
  );

  const stationStats = realStations && realStations.length > 0
    ? [
        ...stats.station_stats,
        ...realStations.slice(0, 5).map((s) => ({
          name: s.name.slice(0, 15),
          available: s.connectors || 1,
          occupied: 0,
          total: s.connectors || 1,
        }))
      ]
    : stats.station_stats;

  const chartTabs = [
    { id: "availability", label: "📈 Hourly Availability" },
    { id: "importance", label: "⚙️ Feature Importance" },
    { id: "stations", label: "🏢 Station Occupancy" },
    { id: "distribution", label: "🥧 Charger Split" },
    { id: "radar", label: "🕸️ Model Radar" },
  ];

  const radarData = [
    { metric: "Accuracy", value: 87 },
    { metric: "Precision", value: 83 },
    { metric: "Recall", value: 90 },
    { metric: "F1-Score", value: 87 },
    { metric: "Coverage", value: 95 },
    { metric: "Speed", value: 92 },
  ];

  return (
    <div className="ml-dashboard">
      <div className="ml-header">
        <h2>📊 Advanced ML Analytics Dashboard</h2>
        <p className="panel-sub">
          Real-time insights from our XGBoost AI model
          {realStations && realStations.length > 0 &&
            ` — enriched with ${realStations.length} real station data`}
        </p>
      </div>

      {/* Stats cards */}
      <div className="ml-stats-grid">
        {[
          { icon: "🎯", value: `${stats.accuracy}%`, label: "Model Accuracy", cls: "accent-blue" },
          { icon: "🧠", value: stats.model_type, label: "Algorithm", cls: "accent-green" },
          { icon: "📈", value: stats.total_predictions.toLocaleString(), label: "Training Samples", cls: "accent-yellow" },
          { icon: "⚙️", value: stats.features_used, label: "Features Used", cls: "accent-purple" },
        ].map((c) => (
          <div key={c.label} className={`ml-stat-card ${c.cls}`}>
            <span className="ml-stat-icon">{c.icon}</span>
            <span className="ml-stat-value">{c.value}</span>
            <span className="ml-stat-label">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Chart tabs */}
      <div className="ml-chart-tabs">
        {chartTabs.map((t) => (
          <button key={t.id}
            className={`ml-tab-btn ${activeChart === t.id ? "active" : ""}`}
            onClick={() => setActiveChart(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="ml-chart-container">
        {activeChart === "availability" && (
          <>
            <h3>📈 AI-Predicted Availability % by Hour</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: 16 }}>
              Predicted availability probability across 24 hours for Station Alpha
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.hourly_predictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" stroke="var(--text-muted)" tick={{ fontSize: 10 }} interval={1} />
                <YAxis stroke="var(--text-muted)" domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="availability" stroke="#2563eb"
                  strokeWidth={3} dot={{ fill: "#2563eb", r: 3 }} name="Availability %" unit="%" />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {activeChart === "importance" && (
          <>
            <h3>⚙️ Feature Importance in AI Model</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: 16 }}>
              Which factors influence availability prediction the most
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.feature_importance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" unit="%" />
                <YAxis type="category" dataKey="feature" stroke="var(--text-muted)"
                  width={120} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="importance" radius={[0, 6, 6, 0]} name="Importance" unit="%">
                  {stats.feature_importance.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {activeChart === "stations" && (
          <>
            <h3>🏢 Real-time Station Slot Occupancy</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: 16 }}>
              Live available vs occupied slots per station
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stationStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="available" fill="#22c55e" name="Available" radius={[4,4,0,0]} />
                <Bar dataKey="occupied" fill="#ef4444" name="Occupied" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {activeChart === "distribution" && (
          <>
            <h3>🥧 Charger Type Distribution</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: 16 }}>
              Fast vs Slow charger breakdown
              {realStations && realStations.length > 0 && " (including real map stations)"}
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Fast Chargers (≥22kW)",
                      value: 4 + (realStations?.filter((s) => s.is_fast).length || 0) },
                    { name: "Slow Chargers (<22kW)",
                      value: 4 + (realStations?.filter((s) => !s.is_fast).length || 0) },
                  ]}
                  cx="50%" cy="50%" outerRadius={120} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#2563eb" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </>
        )}

        {activeChart === "radar" && (
          <>
            <h3>🕸️ Model Performance Radar</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: 16 }}>
              Multi-dimensional view of model quality metrics
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" stroke="var(--text-secondary)"
                  tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--text-muted)" />
                <Radar name="Model" dataKey="value" stroke="#2563eb"
                  fill="#2563eb" fillOpacity={0.3} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Performance metrics */}
      <div className="ml-performance">
        <h3>🎯 Model Performance Metrics</h3>
        <div className="ml-metrics-grid">
          {[
            { label: "Accuracy", value: "87.3%", color: "#22c55e" },
            { label: "Precision (Class 0)", value: "83%", color: "#2563eb" },
            { label: "Recall (Class 0)", value: "83%", color: "#f59e0b" },
            { label: "Precision (Class 1)", value: "90%", color: "#8b5cf6" },
            { label: "Recall (Class 1)", value: "90%", color: "#ec4899" },
            { label: "F1-Score", value: "0.87", color: "#14b8a6" },
          ].map((m) => (
            <div key={m.label} className="ml-metric-card">
              <div className="ml-metric-bar" style={{ background: m.color }} />
              <span className="ml-metric-value" style={{ color: m.color }}>{m.value}</span>
              <span className="ml-metric-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}