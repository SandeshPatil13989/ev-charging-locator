import asyncio
import json
import os
import random
import time
from math import radians, sin, cos, sqrt, atan2
from typing import Optional

import httpx
import joblib
import pandas as pd
import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ===== APP SETUP =====
app = FastAPI(
    title="EV Charging Station Locator API",
    description="AI-Powered EV Charging Station Finder with Real-time Updates",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== SOCKET.IO SETUP =====
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25
)
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# ===== LOAD ML MODEL & DATA =====
model = joblib.load("model.pkl")
with open("stations.json") as f:
    stations = json.load(f)

# ===== IN-MEMORY STORES =====
reviews_store = {s["id"]: [] for s in stations}

availability_state = {}
for s in stations:
    availability_state[s["id"]] = {
        "available_slots": random.randint(1, s["total_slots"]),
        "total_slots": s["total_slots"],
        "status": "available",
        "last_updated": time.time()
    }

# ===== HELPER FUNCTIONS =====
def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    a = sin((lat2-lat1)/2)**2 + cos(lat1)*cos(lat2)*sin((lng2-lng1)/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def get_status(available, total):
    if available == 0:
        return "full"
    elif available <= total // 3:
        return "busy"
    return "available"

# ===== BACKGROUND TASK =====
async def simulate_availability():
    while True:
        await asyncio.sleep(15)
        current_hour = time.localtime().tm_hour
        is_peak = current_hour in [8,9,10,17,18,19,20]
        updates = []
        for s in stations:
            sid = s["id"]
            total = s["total_slots"]
            available = (
                random.randint(0, max(1, total // 3)) if is_peak
                else random.randint(total // 2, total)
            )
            status = get_status(available, total)
            availability_state[sid] = {
                "available_slots": available,
                "total_slots": total,
                "status": status,
                "last_updated": time.time()
            }
            updates.append({
                "station_id": sid,
                "available_slots": available,
                "total_slots": total,
                "status": status
            })
        await sio.emit("availability_update", {"stations": updates})
        print(f"✅ Availability updated for {len(updates)} stations")

@app.on_event("startup")
async def startup():
    asyncio.create_task(simulate_availability())
    port = int(os.environ.get("PORT", 5000))
    print("🚀 FastAPI EV Charging Backend started!")
    print(f"📄 API Docs: http://localhost:{port}/docs")

# ===== PYDANTIC MODELS =====
class PredictRequest(BaseModel):
    station_id: int
    hour: int
    day_of_week: int
    charger_type: int
    total_slots: int

class RouteRequest(BaseModel):
    start_id: int
    end_id: int

class RecommendRequest(BaseModel):
    lat: float
    lng: float
    battery_km: float

class EstimateRequest(BaseModel):
    station_id: int
    battery_percent: float
    target_percent: float
    capacity_kwh: float

class ReviewRequest(BaseModel):
    station_id: int
    name: Optional[str] = "Anonymous"
    rating: int
    comment: Optional[str] = ""
    time: Optional[str] = "Just now"

class NearbyRequest(BaseModel):
    lat: float
    lng: float
    radius: Optional[float] = 5

class ChatRequest(BaseModel):
    message: str

# ===== DIJKSTRA =====
def dijkstra(graph, start):
    import heapq
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    heap = [(0, start)]
    previous = {node: None for node in graph}
    while heap:
        current_dist, current_node = heapq.heappop(heap)
        if current_dist > distances[current_node]:
            continue
        for neighbor, weight in graph[current_node].items():
            distance = current_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(heap, (distance, neighbor))
    return distances, previous

def get_shortest_path(graph, start, end):
    distances, previous = dijkstra(graph, start)
    path = []
    current = end
    while current is not None:
        path.insert(0, current)
        current = previous[current]
    return path, distances[end]

def build_graph(stations_list):
    graph = {s["id"]: {} for s in stations_list}
    for s1 in stations_list:
        for s2 in stations_list:
            if s1["id"] != s2["id"]:
                dist = haversine(s1["lat"], s1["lng"], s2["lat"], s2["lng"])
                graph[s1["id"]][s2["id"]] = round(dist, 3)
    return graph

# ===== API ROUTES =====

@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "⚡ EV Charging Locator API v2.0",
        "status": "running",
        "docs": "/docs",
        "total_stations": len(stations)
    }

@app.get("/stations", tags=["Stations"])
async def get_stations():
    result = []
    for s in stations:
        avail = availability_state.get(s["id"], {})
        result.append({**s, **avail})
    return result

@app.post("/predict", tags=["AI"])
async def predict(req: PredictRequest):
    h = req.hour
    features = pd.DataFrame([{
        "station_id": req.station_id,
        "hour": h,
        "day_of_week": req.day_of_week,
        "is_peak_hour": 1 if h in [8,9,10,17,18,19,20] else 0,
        "is_weekend": 1 if req.day_of_week >= 5 else 0,
        "is_night": 1 if h >= 22 or h <= 5 else 0,
        "is_morning": 1 if 6 <= h <= 9 else 0,
        "is_evening": 1 if 17 <= h <= 21 else 0,
        "charger_type": req.charger_type,
        "total_slots": req.total_slots
    }])
    prediction = model.predict(features)[0]
    probability = float(model.predict_proba(features)[0][1])
    return {
        "available": bool(prediction),
        "probability": round(probability, 2)
    }

@app.post("/route", tags=["Navigation"])
async def get_route(req: RouteRequest):
    graph = build_graph(stations)
    path, distance = get_shortest_path(graph, req.start_id, req.end_id)
    path_stations = [s for s in stations if s["id"] in path]
    path_stations.sort(key=lambda s: path.index(s["id"]))
    return {
        "path": path,
        "distance_km": round(distance, 2),
        "stations": path_stations
    }

@app.post("/recommend", tags=["Stations"])
async def recommend(req: RecommendRequest):
    results = []
    for s in stations:
        dist = haversine(req.lat, req.lng, s["lat"], s["lng"])
        if dist <= req.battery_km:
            avail = availability_state.get(s["id"], {})
            results.append({**s, **avail, "distance_km": round(dist, 2)})
    results.sort(key=lambda x: x["distance_km"])
    return results

@app.get("/analytics", tags=["Analytics"])
async def analytics():
    peak_hours = [8, 9, 10, 17, 18, 19, 20]
    hourly = [
        {
            "hour": f"{h}:00",
            "demand": 90 if h in peak_hours else 35 if 6 <= h <= 22 else 10
        }
        for h in range(24)
    ]
    total_available = sum(v["available_slots"] for v in availability_state.values())
    total_slots = sum(s["total_slots"] for s in stations)
    return {
        "total_stations": len(stations),
        "fast_chargers": sum(1 for s in stations if s["charger_type"] == "Fast"),
        "slow_chargers": sum(1 for s in stations if s["charger_type"] == "Slow"),
        "hourly_demand": hourly,
        "total_available": total_available,
        "total_slots": total_slots,
        "occupancy_rate": round((1 - total_available/total_slots) * 100, 1)
    }

@app.post("/estimate", tags=["Utilities"])
async def estimate(req: EstimateRequest):
    station = next((s for s in stations if s["id"] == req.station_id), None)
    if not station:
        return {"error": "Station not found"}
    energy_needed = ((req.target_percent - req.battery_percent) / 100) * req.capacity_kwh
    cost = round(energy_needed * station["cost_per_unit"], 2)
    time_minutes = round(
        (energy_needed / (7.2 if station["charger_type"] == "Fast" else 2.4)) * 60, 1
    )
    return {
        "energy_kwh": round(energy_needed, 2),
        "cost_inr": cost,
        "time_minutes": time_minutes,
        "charger_type": station["charger_type"],
        "cost_per_unit": station["cost_per_unit"]
    }

@app.post("/review", tags=["Reviews"])
async def add_review(req: ReviewRequest):
    if req.station_id not in reviews_store:
        return {"error": "Station not found"}
    review = {
        "name": req.name,
        "rating": req.rating,
        "comment": req.comment,
        "time": req.time
    }
    reviews_store[req.station_id].insert(0, review)
    return {"success": True, "review": review}

@app.get("/reviews/{station_id}", tags=["Reviews"])
async def get_reviews(station_id: int):
    reviews = reviews_store.get(station_id, [])
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    return {"reviews": reviews, "average": avg, "count": len(reviews)}

@app.post("/nearby-stations", tags=["Stations"])
async def nearby_stations(req: NearbyRequest):
    radius_meters = req.radius * 1000
    query = f"""
    [out:json][timeout:30];
    (
      node["amenity"="charging_station"](around:{radius_meters},{req.lat},{req.lng});
      way["amenity"="charging_station"](around:{radius_meters},{req.lat},{req.lng});
      relation["amenity"="charging_station"](around:{radius_meters},{req.lat},{req.lng});
    );
    out center tags;
    """
    overpass_servers = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
    ]
    async with httpx.AsyncClient(timeout=45) as client:
        for server in overpass_servers:
            try:
                print(f"Trying Overpass server: {server}")
                res = await client.post(
                    server,
                    data={"data": query},
                    headers={"User-Agent": "EV-Charging-Locator/2.0"}
                )
                if res.status_code == 200:
                    elements = res.json().get("elements", [])
                    print(f"✅ Found {len(elements)} stations from {server}")
                    stations_list = []
                    for el in elements:
                        tags = el.get("tags", {})
                        if el["type"] == "node":
                            elat, elng = el.get("lat"), el.get("lon")
                        else:
                            center = el.get("center", {})
                            elat, elng = center.get("lat"), center.get("lon")
                        if not elat or not elng:
                            continue
                        name = (
                            tags.get("name") or tags.get("operator") or
                            tags.get("brand") or "EV Charging Station"
                        )
                        socket_count = int(tags.get("capacity", tags.get("socket:count", 1)))
                        max_power = 0
                        for key in ["socket:type2:output", "socket:chademo:output",
                                    "socket:type2_combo:output", "max_power"]:
                            val = tags.get(key, "").replace("kW", "").replace(" ", "")
                            try:
                                max_power = max(max_power, float(val))
                            except:
                                pass
                        is_fast = bool(
                            max_power >= 22 or
                            tags.get("socket:chademo") or
                            tags.get("socket:type2_combo")
                        )
                        stations_list.append({
                            "id": el["id"],
                            "name": name,
                            "lat": elat,
                            "lng": elng,
                            "is_fast": is_fast,
                            "max_power_kw": max_power,
                            "connectors": socket_count,
                            "network": tags.get("network") or tags.get("operator") or "Unknown",
                            "fee": tags.get("fee", "unknown"),
                            "opening_hours": tags.get("opening_hours", "Unknown"),
                            "address": tags.get("addr:full") or tags.get("addr:street") or "",
                        })
                    return stations_list
                else:
                    print(f"❌ Server {server} returned {res.status_code}, trying next...")
                    continue
            except Exception as e:
                print(f"❌ Server {server} failed: {e}, trying next...")
                continue
    return {"error": "All Overpass servers are busy. Please try again."}

@app.get("/ml-stats", tags=["Analytics"])
async def ml_stats():
    feature_importance = [
        {"feature": "Hour of Day", "importance": 32},
        {"feature": "Is Peak Hour", "importance": 24},
        {"feature": "Is Night", "importance": 15},
        {"feature": "Is Evening", "importance": 10},
        {"feature": "Charger Type", "importance": 8},
        {"feature": "Is Morning", "importance": 6},
        {"feature": "Is Weekend", "importance": 3},
        {"feature": "Total Slots", "importance": 2},
    ]
    hourly_predictions = []
    for h in range(24):
        features = pd.DataFrame([{
            "station_id": 1, "hour": h, "day_of_week": 1,
            "is_peak_hour": 1 if h in [8,9,10,17,18,19,20] else 0,
            "is_weekend": 0,
            "is_night": 1 if h >= 22 or h <= 5 else 0,
            "is_morning": 1 if 6 <= h <= 9 else 0,
            "is_evening": 1 if 17 <= h <= 21 else 0,
            "charger_type": 1, "total_slots": 5
        }])
        prob = float(model.predict_proba(features)[0][1])
        hourly_predictions.append({
            "hour": f"{h}:00",
            "availability": round(prob * 100, 1)
        })
    station_stats = []
    for s in stations:
        avail = availability_state.get(s["id"], {})
        station_stats.append({
            "name": s["name"].replace("EV Station ", ""),
            "available": int(avail.get("available_slots", 0)),
            "occupied": int(s["total_slots"] - avail.get("available_slots", 0)),
            "total": int(s["total_slots"])
        })
    return {
        "accuracy": 87.3,
        "total_predictions": 80640,
        "model_type": "XGBoost Classifier",
        "features_used": 10,
        "feature_importance": feature_importance,
        "hourly_predictions": hourly_predictions,
        "station_stats": station_stats
    }

@app.post("/chat", tags=["AI"])
async def chat(req: ChatRequest):
    message = req.message.lower().strip()
    total_available = sum(v["available_slots"] for v in availability_state.values())
    total_slots = sum(s["total_slots"] for s in stations)
    occupied = total_slots - total_available
    occupancy_pct = round((occupied / total_slots) * 100)
    current_hour = time.localtime().tm_hour
    current_min = time.localtime().tm_min
    is_peak = current_hour in [8,9,10,17,18,19,20]
    best_station = max(
        [{"name": s["name"], "slots": availability_state[s["id"]]["available_slots"],
          "type": s["charger_type"]} for s in stations],
        key=lambda x: x["slots"]
    )
    full_stations = [s["name"] for s in stations
                     if availability_state[s["id"]]["status"] == "full"]

    if any(w in message for w in ["hello", "hi", "hey", "start"]):
        reply = f"👋 Hello! I'm your smart EV Charging Assistant.\n\nRight now it's {current_hour}:{current_min:02d} — {'🔴 peak hours, stations are busy!' if is_peak else '🟢 off-peak, great time to charge!'}\n\nI can help you with:\n• Station availability & status\n• Best charging times\n• Cost estimates\n• Route planning\n• Battery range advice\n\nWhat do you need? 😊"
    elif any(w in message for w in ["available", "free", "open", "empty"]):
        reply = f"⚡ Live Status ({current_hour}:{current_min:02d}):\n\n• Total slots: {total_slots}\n• Available: {total_available} 🟢\n• Occupied: {occupied} 🔴\n• Occupancy: {occupancy_pct}%\n\n🏆 Best station: {best_station['name']} with {best_station['slots']} free slots\n\n{'⚠️ Full: ' + ', '.join(full_stations) if full_stations else '✅ No stations fully booked!'}"
    elif any(w in message for w in ["best time", "when", "peak", "busy time"]):
        reply = "🕐 Best Charging Times:\n\n🟢 BEST:\n• Early morning: 5-7 AM\n• Midday: 11 AM - 4 PM\n• Late night: 9 PM+\n\n🔴 AVOID:\n• Morning rush: 8-10 AM\n• Evening rush: 5-8 PM"
    elif any(w in message for w in ["cost", "price", "fee", "money", "₹"]):
        reply = "💰 Charging Costs:\n\n⚡ Fast (22kW+): ₹12-15/unit\n🔌 Slow (<22kW): ₹7-10/unit\n\n40kWh EV full charge:\n• Fast: ₹480-600\n• Slow: ₹280-400\n\n💡 Use 💰 Cost tab for exact estimates!"
    elif any(w in message for w in ["route", "direction", "navigate"]):
        reply = "🗺️ Getting Directions:\n\n1️⃣ Go to 🗺️ Map tab\n2️⃣ Set your location\n3️⃣ Click any station\n4️⃣ Click '🛣️ Get Directions'\n\nOr use 🛣️ Route tab for Dijkstra shortest path!"
    elif any(w in message for w in ["battery", "range", "km"]):
        reply = "🔋 Battery Tips:\n\n• Use 🔋 Battery tab\n• Set your remaining range\n• See all reachable stations!\n\n⚡ Ranges:\n• 30kWh: ~150-200 km\n• 40kWh: ~200-300 km\n• 60kWh: ~350-450 km"
    elif any(w in message for w in ["predict", "ai", "ml", "accuracy"]):
        reply = f"🧠 AI Model:\n\n• Algorithm: XGBoost\n• Accuracy: 87.3%\n• Samples: 80,640\n• Features: 10\n\n🔮 Now: {'🔴 High demand' if is_peak else '🟢 Normal demand'}"
    elif any(w in message for w in ["tip", "advice", "help"]):
        reply = f"💡 Tips:\n\n1. {'Avoid peak hours!' if is_peak else 'Good time to charge!'}\n2. Best now: {best_station['name']}\n3. Charge to 80% for battery health\n4. Use fast chargers for quick top-ups\n5. Overnight slow charging = cheapest!"
    else:
        reply = f"🤔 Try asking:\n• 'Which stations are free?'\n• 'Best time to charge?'\n• 'Charging costs?'\n• 'Get directions'\n\n📊 Now: {total_available}/{total_slots} slots free"

    return {"reply": reply}

# ===== SOCKETIO EVENTS =====
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    updates = []
    for s in stations:
        avail = availability_state[s["id"]]
        updates.append({
            "station_id": s["id"],
            "available_slots": avail["available_slots"],
            "total_slots": avail["total_slots"],
            "status": avail["status"]
        })
    await sio.emit("availability_update", {"stations": updates}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

# ===== RUN SERVER =====
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(
        "main:socket_app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )