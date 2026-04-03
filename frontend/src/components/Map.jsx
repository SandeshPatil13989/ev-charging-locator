import { useEffect, useRef, useState } from "react";
import {
  MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getNearbyStations } from "../api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const fastIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const slowIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [30, 46], iconAnchor: [15, 46], popupAnchor: [1, -40],
});

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 1.5 });
  }, [position, map]);
  return null;
}

function MapClickHandler({ onMapClick, clickMode }) {
  useMapEvents({
    click(e) {
      if (clickMode) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function RoutingControl({ from, to }) {
  const map = useMap();
  const routingRef = useRef(null);
  useEffect(() => {
    if (!from || !to) return;
    if (routingRef.current) {
      try {
        routingRef.current.getPlan().setWaypoints([]);
        map.removeControl(routingRef.current);
      } catch (e) {}
      routingRef.current = null;
    }
    let mounted = true;
    import("leaflet-routing-machine").then(() => {
      if (!mounted) return;
      try {
        routingRef.current = L.Routing.control({
          waypoints: [L.latLng(from.lat, from.lng), L.latLng(to.lat, to.lng)],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: true,
          show: true,
          lineOptions: { styles: [{ color: "#2563eb", weight: 5, opacity: 0.85 }] },
          createMarker: () => null,
        }).addTo(map);
      } catch (e) {}
    });
    return () => {
      mounted = false;
      if (routingRef.current) {
        try {
          routingRef.current.getPlan().setWaypoints([]);
          map.removeControl(routingRef.current);
        } catch (e) {}
        routingRef.current = null;
      }
    };
  }, [from, to, map]);
  return null;
}

export default function Map({ stations: localStations, availability, onRealStationsFound, onUserLocationChange }) {
  const [userLocation, setUserLocation] = useState(null);
  const [realStations, setRealStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5);
  const [routeTarget, setRouteTarget] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [searchCity, setSearchCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [clickMode, setClickMode] = useState(false);

  const setLocation = (loc) => {
    setUserLocation(loc);
    localStorage.setItem("ev_user_location", JSON.stringify(loc));
    if (onUserLocationChange) onUserLocationChange(loc);
  };

  const fetchRealStations = async (lat, lng, radiusKm) => {
    setLoading(true);
    setStatusMsg("🔍 Fetching nearby EV stations...");
    try {
      const res = await getNearbyStations(lat, lng, radiusKm);
      const data = res.data;
      if (data.error) {
        setStatusMsg("⚠️ " + data.error);
      } else {
        setRealStations(data);
        if (onRealStationsFound) onRealStationsFound(data);
        setStatusMsg(
          data.length > 0
            ? `✅ Found ${data.length} real EV station(s) within ${radiusKm} km`
            : `⚠️ No stations found within ${radiusKm} km — try increasing radius`
        );
      }
    } catch {
      setStatusMsg("⚠️ Connection issue — retrying...");
      setTimeout(() => {
        getNearbyStations(lat, lng, radiusKm)
          .then((res) => {
            if (res.data && !res.data.error) {
              setRealStations(res.data);
              if (onRealStationsFound) onRealStationsFound(res.data);
              setStatusMsg(`✅ Found ${res.data.length} real EV station(s) within ${radiusKm} km`);
            }
          })
          .catch(() => setStatusMsg("❌ Backend error. Make sure FastAPI is running!"));
      }, 3000);
    }
    setLoading(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setStatusMsg("❌ Geolocation not supported."); return; }
    setDetecting(true);
    setStatusMsg("📡 Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setDetecting(false);
        setRouteTarget(null);
        setClickMode(false);
        setSearchCity("");
        setAddressInput("");
        fetchRealStations(loc.lat, loc.lng, radius);
      },
      () => {
        setStatusMsg("❌ GPS failed. Try typing your address or clicking the map.");
        setDetecting(false);
      }
    );
  };

  const searchByCity = async () => {
    if (!searchCity.trim()) return;
    setSearching(true);
    setStatusMsg(`🔍 Searching for "${searchCity}"...`);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchCity + ", India")}&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length === 0) { setStatusMsg("❌ City not found."); setSearching(false); return; }
      const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      setLocation(loc);
      setRouteTarget(null);
      setAddressInput("");
      setClickMode(false);
      fetchRealStations(loc.lat, loc.lng, radius);
    } catch { setStatusMsg("❌ Search failed."); }
    setSearching(false);
  };

  const searchByAddress = async () => {
    if (!addressInput.trim()) return;
    setSearchingAddress(true);
    setStatusMsg(`📍 Finding "${addressInput}"...`);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressInput)}&format=json&limit=1&addressdetails=1`
      );
      const data = await res.json();
      if (data.length === 0) {
        setStatusMsg("❌ Address not found. Try: Area, City, State");
        setSearchingAddress(false);
        return;
      }
      const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      setLocation(loc);
      setRouteTarget(null);
      setSearchCity("");
      setClickMode(false);
      setStatusMsg(`✅ Location set: ${data[0].display_name.slice(0, 80)}`);
      fetchRealStations(loc.lat, loc.lng, radius);
    } catch { setStatusMsg("❌ Address search failed."); }
    setSearchingAddress(false);
  };

  const handleMapClick = (loc) => {
    setLocation(loc);
    setClickMode(false);
    setRouteTarget(null);
    setSearchCity("");
    setAddressInput("");
    setStatusMsg(`📍 Location set: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`);
    fetchRealStations(loc.lat, loc.lng, radius);
  };

  useEffect(() => {
    if (!userLocation) return;
    const timer = setTimeout(() => {
      fetchRealStations(userLocation.lat, userLocation.lng, radius);
    }, 1000);
    return () => clearTimeout(timer);
  }, [radius]); // eslint-disable-line react-hooks/exhaustive-deps

  const showRoute = (station) => {
    if (!userLocation) { setStatusMsg("⚠️ Set your location first!"); return; }
    setRouteTarget(station);
    setStatusMsg(`🛣️ Showing route to ${station.name}`);
  };

  const parsedRealStations = realStations.filter((s) => s.lat && s.lng);

  return (
    <div className="map-wrap">
      <div className="map-controls">
        {/* Row 1: GPS + City */}
        <div className="map-control-group" style={{ width: "100%" }}>
          <button
            className={`btn-detect ${detecting ? "detecting" : ""}`}
            onClick={detectLocation} disabled={detecting || loading}
          >
            {detecting ? "📡 Detecting..." : "📍 Detect My Location"}
          </button>
          <span className="or-divider">OR</span>
          <div className="city-search-wrap">
            <input type="text" placeholder="Search city... (e.g. Mysuru, Mumbai)"
              value={searchCity} onChange={(e) => setSearchCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchByCity()}
              className="city-search-input" />
            <button className="btn-search-city" onClick={searchByCity} disabled={searching || loading}>
              {searching ? "🔍" : "Search"}
            </button>
          </div>
        </div>

        {/* Row 2: Address + Click */}
        <div className="map-control-group" style={{ width: "100%" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem",
            whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" }}>
            📍 My Address:
          </span>
          <div className="city-search-wrap">
            <input type="text" placeholder="e.g. Vijayanagar, Mysuru, Karnataka"
              value={addressInput} onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchByAddress()}
              className="city-search-input" />
            <button className="btn-search-city" onClick={searchByAddress}
              disabled={searchingAddress || loading}
              style={{ background: "linear-gradient(135deg, #0f766e, #0d9488)" }}>
              {searchingAddress ? "🔍" : "Set"}
            </button>
          </div>
          <span className="or-divider">OR</span>
          <button className="btn-detect" onClick={() => {
            setClickMode(!clickMode);
            setStatusMsg(clickMode ? "" : "🖱️ Click anywhere on the map to set your location!");
          }} style={{
            background: clickMode ? "linear-gradient(135deg, #0f766e, #0d9488)" : "var(--bg-surface)",
            whiteSpace: "nowrap", boxShadow: clickMode ? "var(--glow-cyan)" : "none",
          }}>
            {clickMode ? "🖱️ Clicking..." : "🖱️ Click Map"}
          </button>
        </div>

        {/* Row 3: Radius */}
        {userLocation && (
          <div className="map-control-group">
            <label className="radius-label">📏 Radius: <strong>{radius} km</strong></label>
            <input type="range" min="1" max="25" value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))} />
            <span className="nearby-count">
              {loading ? "⏳ Loading..." : `⚡ ${parsedRealStations.length} station(s) found`}
            </span>
          </div>
        )}

        {routeTarget && (
          <button className="btn-clear-route"
            onClick={() => { setRouteTarget(null); setStatusMsg(""); }}>
            ✖ Clear Route
          </button>
        )}
      </div>

      {statusMsg && (
        <div className={`location-status ${clickMode ? "click-mode-active" : ""}`}>
          {statusMsg}
        </div>
      )}

      <div className="map-legend">
        <span>🔴 You</span>
        <span>🟢 Fast Charger (≥22kW)</span>
        <span>🔵 Slow Charger</span>
        {userLocation && <span>⭕ {radius}km Search Area</span>}
        {clickMode && <span style={{ color: "#0d9488" }}>🖱️ Click mode ON</span>}
      </div>

      <MapContainer center={[20.5937, 78.9629]} zoom={5}
        style={{ height: "540px", width: "100%", borderRadius: "12px",
          cursor: clickMode ? "crosshair" : "grab" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors" />

        {userLocation && <FlyTo position={[userLocation.lat, userLocation.lng]} />}
        <MapClickHandler onMapClick={handleMapClick} clickMode={clickMode} />

        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <strong>📍 Your Location</strong><br />
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                </span>
              </Popup>
            </Marker>
            <Circle center={[userLocation.lat, userLocation.lng]} radius={radius * 1000}
              pathOptions={{ color: "#2563eb", fillColor: "#2563eb",
                fillOpacity: 0.07, dashArray: "6 4" }} />
          </>
        )}

        {parsedRealStations.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]}
            icon={s.is_fast ? fastIcon : slowIcon}>
            <Popup>
              <div style={{ minWidth: 190, fontFamily: "sans-serif" }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem",
                  marginBottom: 6, color: "#0f172a" }}>{s.name}</div>
                {s.address && (
                  <div style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: 8 }}>
                    📍 {s.address}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column",
                  gap: 4, fontSize: "0.82rem", marginBottom: 8 }}>
                  <span>⚡ Power: <strong>{s.max_power_kw > 0 ? s.max_power_kw + " kW" : "N/A"}</strong></span>
                  <span>🔌 Connectors: <strong>{s.connectors}</strong></span>
                  <span>🏷️ Type: <strong style={{ color: s.is_fast ? "#16a34a" : "#2563eb" }}>
                    {s.is_fast ? "⚡ Fast" : "🔌 Slow"}</strong></span>
                  <span>🌐 Network: <strong>{s.network}</strong></span>
                  <span>💰 Fee: <strong>{s.fee}</strong></span>
                  <span>🕐 Hours: <strong>{s.opening_hours}</strong></span>
                  {userLocation && (
                    <span style={{ color: "#2563eb", fontWeight: 600 }}>
                      📍 {haversine(userLocation.lat, userLocation.lng, s.lat, s.lng).toFixed(2)} km away
                    </span>
                  )}
                </div>
                <button onClick={() => showRoute(s)} style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "white", border: "none", padding: "8px 12px",
                  borderRadius: 8, cursor: "pointer", width: "100%",
                  fontSize: "0.85rem", fontWeight: 600,
                }}>
                  🛣️ Get Directions
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && routeTarget && (
          <RoutingControl from={userLocation} to={{ lat: routeTarget.lat, lng: routeTarget.lng }} />
        )}
      </MapContainer>

      {routeTarget && (
        <div className="route-info-card">
          <span>🛣️ Route to <strong>{routeTarget.name}</strong></span>
          <span className={`badge ${routeTarget.is_fast ? "badge-fast" : "badge-slow"}`}>
            {routeTarget.is_fast ? "⚡ Fast" : "🔌 Slow"}
          </span>
        </div>
      )}
    </div>
  );
}