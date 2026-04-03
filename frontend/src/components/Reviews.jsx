import { useState, useEffect } from "react";
import { submitReview, getReviews } from "../api";

export default function Reviews({ realStations }) {
  const [selectedStation, setSelectedStation] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [form, setForm] = useState({ name: "", rating: 5, comment: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const mapStations = (realStations || []).map((s) => ({
    id: s.id, name: s.name,
    charger_type: s.is_fast ? "Fast" : "Slow",
  }));

  useEffect(() => {
    if (mapStations.length > 0) setSelectedStation(mapStations[0]);
  }, [realStations]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReviews = async (id) => {
    setLoading(true);
    try {
      const res = await getReviews(1); // use station 1 as proxy for real stations
      setReviews(res.data.reviews);
      setAverage(res.data.average);
    } catch { setReviews([]); setAverage(0); }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedStation) loadReviews(selectedStation.id);
  }, [selectedStation]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!form.comment.trim()) { alert("Please write a comment!"); return; }
    try {
      await submitReview({ ...form, station_id: 1, time: new Date().toLocaleString() });
      setSubmitted(true);
      setForm({ name: "", rating: 5, comment: "" });
      loadReviews(1);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {}
  };

  const stars = (rating) => "⭐".repeat(rating) + "☆".repeat(5 - rating);

  if (mapStations.length === 0) {
    return (
      <div className="panel">
        <h2>⭐ Station Ratings & Reviews</h2>
        <p className="panel-sub">Share your charging experience</p>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 32, textAlign: "center"
        }}>
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>⭐</p>
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
      <h2>⭐ Station Ratings & Reviews</h2>
      <p className="panel-sub">
        Share your charging experience — {mapStations.length} real station(s) available
      </p>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label>Select Station</label>
        <select onChange={(e) => {
          const s = mapStations.find((s) => String(s.id) === e.target.value);
          if (s) setSelectedStation(s);
        }} value={selectedStation?.id || ""}>
          {mapStations.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStation && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 16px", marginBottom: 16,
          fontSize: "0.82rem", display: "flex", gap: 12, alignItems: "center"
        }}>
          <strong style={{ color: "var(--accent-cyan)" }}>{selectedStation.name}</strong>
          <span className={`badge ${selectedStation.charger_type === "Fast" ? "badge-fast" : "badge-slow"}`}>
            {selectedStation.charger_type === "Fast" ? "⚡ Fast" : "🔌 Slow"}
          </span>
          <span style={{ color: "var(--accent-yellow)", fontSize: "0.75rem" }}>🗺️ Real station</span>
        </div>
      )}

      <div className="rating-summary">
        <span className="big-rating">{average || "—"}</span>
        <div>
          <div className="stars-display">{average ? stars(Math.round(average)) : "No reviews yet"}</div>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {reviews.length} review(s)
          </span>
        </div>
      </div>

      <div className="review-form">
        <h3>✍️ Write a Review</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Your Name</label>
            <input type="text" placeholder="Anonymous" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ background: "var(--bg-deep)", border: "1px solid var(--border)",
                color: "var(--text-primary)", padding: "8px 12px", borderRadius: "8px",
                fontSize: "0.9rem", fontFamily: "'Exo 2', sans-serif" }} />
          </div>
          <div className="form-group">
            <label>Rating: {stars(form.rating)}</label>
            <input type="range" min="1" max="5" value={form.rating}
              onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Comment</label>
          <textarea placeholder="Share your experience..." value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            style={{ background: "var(--bg-deep)", border: "1px solid var(--border)",
              color: "var(--text-primary)", padding: "10px 12px", borderRadius: "8px",
              fontSize: "0.9rem", width: "100%", minHeight: "80px", resize: "vertical",
              fontFamily: "'Exo 2', sans-serif" }} />
        </div>
        <button className="btn-primary" onClick={handleSubmit}>⭐ Submit Review</button>
        {submitted && <span style={{ color: "#22c55e", marginLeft: 12 }}>✅ Submitted!</span>}
      </div>

      <div className="reviews-list">
        {loading && <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>⏳ Loading...</div>}
        {!loading && reviews.length === 0 && <p className="no-result">No reviews yet. Be the first!</p>}
        {reviews.map((r, i) => (
          <div key={i} className="review-card">
            <div className="review-header">
              <strong>{r.name || "Anonymous"}</strong>
              <span className="review-stars">{stars(r.rating)}</span>
            </div>
            <p className="review-comment">{r.comment}</p>
            <span className="review-time">{r.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}