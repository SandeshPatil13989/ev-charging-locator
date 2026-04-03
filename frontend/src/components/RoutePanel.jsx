import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhe/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

function RoutingControl({ from, to }) {
  const map = useMap();
  const routingRef = useRef(null);
  useEffect(() => {
    if (!from || !to) return;
    if (routingRef.current) {
      try { routingRef.current.getPlan().setWaypoints([]); map.removeControl(routingRef.current); } catch (e) {}
      routingRef.current = null;
    }
    let mounted = true;
    import("leaflet-routing-machine").then(() => {
      if (!mounted) return;
      try {
        routingRef.current = L.Routing.control({
          waypoints: [L.latLng(from.lat, from.lng), L.latLng(to.lat, to.lng)],
          routeWhileDragging: false, addWaypoints: false,
          draggableWaypoints: false, fitSelectedRoutes: true, show: true,
          lineOptions: { styles: [{ color: "#2563eb", weight: 5, opacity: 0.85 }] },
          createMarker: () => null,
        }).addTo(map);
      } catch (e) {}
    });
    return () => {
      mounted = false;
      if (routingRef.current) {
        try { routingRef.current.getPlan().setWaypoints([]); map.removeControl(routingRef.current); } catch (e) {}
        routingRef.current = null;
      }
    };
  }, [from, to, map]);
  return null;
}

export default function RoutePanel({ realStations }) {
  const [startId, setStartId] = useState("");
  const [endId, setEndId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState(null);

  const mapStations = (realStations || []).map((s) => ({
    id: s.id, name: s.name, lat: s.lat, lng: s.lng,
    charger_type: s.is_fast ? "Fast" : "Slow",
  }));

  useEffect(() => {
    if (mapStations.length >= 2) {
      setStartId(String(mapStations[0].id));
      setEndId(String(mapStations[1].id));
    }
    setResult(null);
    setRouteCoords(null);
  }, [realStations]); // eslint-disable-line react-hooks/exhaustive-deps

  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 100) / 100;
  };

  const findRoute = () => {
    if (!startId || !endId || startId === endId) {
      alert("Please select two different stations!"); return;
    }
    setLoading(true);
    const from = mapStations.find((s) => String(s.id) === startId);
    const to = mapStations.find((s) => String(s.id) === endId);
    if (from && to) {
      const dist = calcDistance(from.lat, from.lng, to.lat, to.lng);
      setResult({ distance_km: dist, stations: [from, to] });
      setRouteCoords({ from, to });
    }
    setLoading(false);
  };

  if (mapStations.length < 2) {
    return (
      <div className="panel">
        <h2>🛣️ Route Optimizer</h2>
        <p className="panel-sub">Find the shortest path between two charging stations</p>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 32, textAlign: "center"
        }}>
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>🛣️</p>
          <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
            Need at least 2 stations to plan a route.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Go to <strong>🗺️ Map</strong> tab and search a city to find real EV stations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: 800 }}>
      <h2>🛣️ Route Optimizer</h2>
      <p className="panel-sub">
        Find the shortest path between two charging stations using Dijkstra's Algorithm —
        {mapStations.length} real stations available
      </p>

      <div className="form-grid">
        <div className="form-group">
          <label>Start Station</label>
          <select value={startId} onChange={(e) => { setStartId(e.target.value); setResult(null); setRouteCoords(null); }}>
            {mapStations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>End Station</label>
          <select value={endId} onChange={(e) => { setEndId(e.target.value); setResult(null); setRouteCoords(null); }}>
            {mapStations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <button className="btn-primary" onClick={findRoute} disabled={loading || !startId || !endId}>
        {loading ? "⏳ Calculating..." : "🗺️ Find Shortest Route"}
      </button>

      {result && (
        <div className="result-box available" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
            <span className="result-icon">📍</span>
            <div>
              <strong style={{ fontSize: "1.05rem" }}>Optimal Route Found!</strong>
              <p>Total Distance: <strong style={{ color: "var(--accent-cyan)" }}>
                {result.distance_km} km
              </strong></p>
            </div>
          </div>
          <div className="route-path" style={{ width: "100%" }}>
            {result.stations.map((s, i) => (
              <span key={s.id}>
                <span className="route-stop">{s.name}</span>
                {i < result.stations.length - 1 && <span className="route-arrow"> → </span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {routeCoords && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12, fontSize: "1rem", color: "var(--text-secondary)" }}>
            🗺️ Route on Map
          </h3>
          <MapContainer
            center={[(routeCoords.from.lat + routeCoords.to.lat)/2, (routeCoords.from.lng + routeCoords.to.lng)/2]}
            zoom={13} style={{ height: 380, borderRadius: 12 }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            <Marker position={[routeCoords.from.lat, routeCoords.from.lng]} icon={startIcon}>
              <Popup><strong>🟢 Start: {routeCoords.from.name}</strong></Popup>
            </Marker>
            <Marker position={[routeCoords.to.lat, routeCoords.to.lng]} icon={endIcon}>
              <Popup><strong>🔴 End: {routeCoords.to.name}</strong></Popup>
            </Marker>
            <RoutingControl from={routeCoords.from} to={routeCoords.to} />
          </MapContainer>
        </div>
      )}
    </div>
  );
}