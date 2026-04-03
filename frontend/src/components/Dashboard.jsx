import { useState, useEffect } from "react";

export default function Dashboard({ analytics, availability, stations, realStations }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimated(true), 100);
  }, []);

  const totalAvailable = Object.values(availability).reduce(
    (sum, a) => sum + (a.available_slots || 0), 0
  );
  const totalSlots = stations.reduce((sum, s) => sum + s.total_slots, 0);
  const occupancy = totalSlots > 0
    ? Math.round(((totalSlots - totalAvailable) / totalSlots) * 100)
    : 0;

  const realCount = (realStations || []).length;
  const realFast = (realStations || []).filter((s) => s.is_fast).length;
  const realSlow = (realStations || []).filter((s) => !s.is_fast).length;

  const totalStations = realCount > 0 ? realCount : analytics.total_stations;
  const totalFast = realCount > 0 ? realFast : analytics.fast_chargers;
  const totalSlow = realCount > 0 ? realSlow : analytics.slow_chargers;

  const cards = [
    {
      label: "Total Stations",
      value: totalStations,
      icon: "📍",
      color: "#06b6d4",
      sub: realCount > 0 ? `${realCount} real stations` : "Search a city on map",
    },
    {
      label: "Fast Chargers",
      value: totalFast,
      icon: "⚡",
      color: "#f59e0b",
      sub: realCount > 0 ? `${realFast} fast (≥22kW)` : "No stations yet",
    },
    {
      label: "Slow Chargers",
      value: totalSlow,
      icon: "🔌",
      color: "#8b5cf6",
      sub: realCount > 0 ? `${realSlow} slow (<22kW)` : "No stations yet",
    },
    {
      label: "Live Slots",
      value: totalAvailable > 0 ? totalAvailable : "—",
      icon: "🟢",
      color: totalAvailable > 0 ? "#22c55e" : "#64748b",
      sub: totalAvailable > 0
        ? `of ${totalSlots} total slots`
        : "WebSocket connecting...",
    },
    {
      label: "Occupancy",
      value: totalAvailable > 0 ? `${occupancy}%` : "—",
      icon: "📊",
      color: occupancy > 70 ? "#ef4444"
        : occupancy > 40 ? "#f59e0b" : "#22c55e",
      sub: occupancy > 70 ? "🔴 High demand"
        : occupancy > 40 ? "🟡 Moderate"
        : totalAvailable > 0 ? "🟢 Low traffic"
        : "Waiting for data",
    },
    {
      label: "AI Accuracy",
      value: "87.3%",
      icon: "🧠",
      color: "#8b5cf6",
      sub: "XGBoost model",
    },
  ];

  return (
    <div className="dashboard">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className="stat-card"
          style={{
            opacity: animated ? 1 : 0,
            transform: animated ? "translateY(0)" : "translateY(10px)",
            transition: `all 0.4s ease ${i * 0.06}s`,
          }}
        >
          <span className="stat-icon">{c.icon}</span>
          <span className="stat-value" style={{ color: c.color }}>{c.value}</span>
          <span className="stat-label">{c.label}</span>
          <span style={{
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            textAlign: "center",
            marginTop: 2,
          }}>
            {c.sub}
          </span>
        </div>
      ))}
    </div>
  );
}