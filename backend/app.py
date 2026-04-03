import eventlet
eventlet.monkey_patch()
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import joblib
import json
import pandas as pd
import requests
import random
import time
from math import radians, sin, cos, sqrt, atan2
from dijkstra import build_graph, get_shortest_path

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ev_charging_secret'
CORS(app, origins="*")
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
    async_mode="eventlet"
)

# Load ML model and stations
model = joblib.load("model.pkl")
with open("stations.json") as f:
    stations = json.load(f)

# In-memory reviews store
reviews_store = {s["id"]: [] for s in stations}

# ✅ Real-time availability state
availability_state = {}
for s in stations:
    availability_state[s["id"]] = {
        "available_slots": random.randint(1, s["total_slots"]),
        "total_slots": s["total_slots"],
        "status": "available",
        "last_updated": time.time()
    }

def simulate_availability():
    """Background thread — updates station availability every 15 seconds"""
    while True:
        eventlet.sleep(15)
        current_hour = time.localtime().tm_hour
        is_peak = current_hour in [8,9,10,17,18,19,20]
        updates = []
        for s in stations:
            sid = s["id"]
            total = s["total_slots"]
            if is_peak:
                available = random.randint(0, max(1, total // 3))
            else:
                available = random.randint(total // 2, total)
            if available == 0:
                status = "full"
            elif available <= total // 3:
                status = "busy"
            else:
                status = "available"
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
        socketio.emit("availability_update", {"stations": updates})
        print(f"✅ Availability updated for {len(updates)} stations")

# Start background thread using eventlet
eventlet.spawn(simulate_availability)

def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    a = sin((lat2-lat1)/2)**2 + cos(lat1)*cos(lat2)*sin((lng2-lng1)/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

# ✅ Route 1: Get all stations with availability
@app.route("/stations", methods=["GET"])
def get_stations():
    result = []
    for s in stations:
        avail = availability_state.get(s["id"], {})
        result.append({**s, **avail})
    return jsonify(result)

# ✅ Route 2: Predict availability
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    h = data["hour"]
    features = pd.DataFrame([{
        "station_id": data["station_id"],
        "hour": h,
        "day_of_week": data["day_of_week"],
        "is_peak_hour": 1 if h in [8,9,10,17,18,19,20] else 0,
        "is_weekend": 1 if data["day_of_week"] >= 5 else 0,
        "is_night": 1 if h >= 22 or h <= 5 else 0,
        "is_morning": 1 if 6 <= h <= 9 else 0,
        "is_evening": 1 if 17 <= h <= 21 else 0,
        "charger_type": data["charger_type"],
        "total_slots": data["total_slots"]
    }])
    prediction = model.predict(features)[0]
    probability = float(model.predict_proba(features)[0][1])
    return jsonify({
        "available": bool(prediction),
        "probability": round(probability, 2)
    })

# ✅ Route 3: Route optimization
@app.route("/route", methods=["POST"])
def route():
    data = request.json
    start_id = data["start_id"]
    end_id = data["end_id"]
    graph = build_graph(stations)
    path, distance = get_shortest_path(graph, start_id, end_id)
    path_stations = [s for s in stations if s["id"] in path]
    path_stations.sort(key=lambda s: path.index(s["id"]))
    return jsonify({"path": path, "distance_km": round(distance, 2), "stations": path_stations})

# ✅ Route 4: Battery-aware recommendations
@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json
    user_lat = data["lat"]
    user_lng = data["lng"]
    battery_km = data["battery_km"]
    results = []
    for s in stations:
        dist = haversine(user_lat, user_lng, s["lat"], s["lng"])
        if dist <= battery_km:
            avail = availability_state.get(s["id"], {})
            results.append({**s, **avail, "distance_km": round(dist, 2)})
    results.sort(key=lambda x: x["distance_km"])
    return jsonify(results)

# ✅ Route 5: Analytics
@app.route("/analytics", methods=["GET"])
def analytics():
    peak_hours = [8, 9, 10, 17, 18, 19, 20]
    hourly = []
    for h in range(24):
        hourly.append({
            "hour": f"{h}:00",
            "demand": 90 if h in peak_hours else 35 if 6 <= h <= 22 else 10
        })
    total_available = sum(v["available_slots"] for v in availability_state.values())
    total_slots = sum(s["total_slots"] for s in stations)
    return jsonify({
        "total_stations": len(stations),
        "fast_chargers": sum(1 for s in stations if s["charger_type"] == "Fast"),
        "slow_chargers": sum(1 for s in stations if s["charger_type"] == "Slow"),
        "hourly_demand": hourly,
        "total_available": total_available,
        "total_slots": total_slots,
        "occupancy_rate": round((1 - total_available/total_slots) * 100, 1)
    })

# ✅ Route 6: Cost Estimator
@app.route("/estimate", methods=["POST"])
def estimate():
    data = request.json
    battery_percent = data["battery_percent"]
    target_percent = data["target_percent"]
    vehicle_capacity_kwh = data["capacity_kwh"]
    station_id = data["station_id"]
    station = next((s for s in stations if s["id"] == station_id), None)
    if not station:
        return jsonify({"error": "Station not found"}), 404
    energy_needed = ((target_percent - battery_percent) / 100) * vehicle_capacity_kwh
    cost = round(energy_needed * station["cost_per_unit"], 2)
    time_minutes = round(
        (energy_needed / (7.2 if station["charger_type"] == "Fast" else 2.4)) * 60, 1
    )
    return jsonify({
        "energy_kwh": round(energy_needed, 2),
        "cost_inr": cost,
        "time_minutes": time_minutes,
        "charger_type": station["charger_type"],
        "cost_per_unit": station["cost_per_unit"]
    })

# ✅ Route 7: Submit review
@app.route("/review", methods=["POST"])
def add_review():
    data = request.json
    station_id = data["station_id"]
    if station_id not in reviews_store:
        return jsonify({"error": "Station not found"}), 404
    review = {
        "name": data.get("name", "Anonymous"),
        "rating": data["rating"],
        "comment": data.get("comment", ""),
        "time": data.get("time", "Just now")
    }
    reviews_store[station_id].insert(0, review)
    return jsonify({"success": True, "review": review})

# ✅ Route 8: Get reviews
@app.route("/reviews/<int:station_id>", methods=["GET"])
def get_reviews(station_id):
    reviews = reviews_store.get(station_id, [])
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    return jsonify({"reviews": reviews, "average": avg, "count": len(reviews)})

# ✅ Route 9: Nearby stations via Overpass
@app.route("/nearby-stations", methods=["POST"])
def nearby_stations():
    data = request.json
    lat = data["lat"]
    lng = data["lng"]
    radius = data.get("radius", 5)
    radius_meters = radius * 1000
    try:
        overpass_url = "https://overpass-api.de/api/interpreter"
        query = f"""
        [out:json][timeout:30];
        (
          node["amenity"="charging_station"](around:{radius_meters},{lat},{lng});
          way["amenity"="charging_station"](around:{radius_meters},{lat},{lng});
          relation["amenity"="charging_station"](around:{radius_meters},{lat},{lng});
        );
        out center tags;
        """
        res = requests.post(
            overpass_url,
            data={"data": query},
            headers={"User-Agent": "EV-Charging-Locator/1.0"},
            timeout=45
        )
        if res.status_code != 200:
            return jsonify({"error": f"Overpass returned {res.status_code}"}), 500
        elements = res.json().get("elements", [])
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
                tags.get("name") or
                tags.get("operator") or
                tags.get("brand") or
                "EV Charging Station"
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
        return jsonify(stations_list)
    except requests.exceptions.Timeout:
        return jsonify({"error": "Overpass API timed out. Try smaller radius."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Route 10: ML Dashboard Data
@app.route("/ml-stats", methods=["GET"])
def ml_stats():
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
        # ✅ Fix: convert float32 to Python float
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
    return jsonify({
        "accuracy": 87.3,
        "total_predictions": 80640,
        "model_type": "XGBoost Classifier",
        "features_used": 10,
        "feature_importance": feature_importance,
        "hourly_predictions": hourly_predictions,
        "station_stats": station_stats
    })

# ✅ Route 11: AI Chatbot
@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    message = data.get("message", "").lower().strip()
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

    if any(w in message for w in ["hello", "hi", "hey", "start", "help me"]):
        reply = f"👋 Hello! I'm your smart EV Charging Assistant.\n\nRight now it's {current_hour}:{current_min:02d} — {'🔴 peak hours, stations are busy!' if is_peak else '🟢 off-peak, great time to charge!'}\n\nI can help you with:\n• Station availability & status\n• Best charging times\n• Cost estimates\n• Route planning\n• Battery range advice\n\nWhat do you need? 😊"
    elif any(w in message for w in ["available", "free", "open", "empty", "vacancy"]):
        reply = f"⚡ Live Status ({current_hour}:{current_min:02d}):\n\n• Total slots: {total_slots}\n• Available: {total_available} 🟢\n• Occupied: {occupied} 🔴\n• Occupancy: {occupancy_pct}%\n\n🏆 Best station right now: {best_station['name']} with {best_station['slots']} free slots ({best_station['type']} charger)\n\n{'⚠️ Fully booked: ' + ', '.join(full_stations) if full_stations else '✅ No stations are fully booked!'}"
    elif any(w in message for w in ["best time", "when to charge", "when should", "peak", "busy time", "off peak"]):
        reply = "🕐 Best Charging Times:\n\n🟢 BEST (Low demand):\n• Early morning: 5 AM - 7 AM\n• Midday: 11 AM - 4 PM\n• Late night: 9 PM - 12 AM\n\n🔴 AVOID (Peak hours):\n• Morning rush: 8 AM - 10 AM\n• Evening rush: 5 PM - 8 PM\n\n💡 Pro tip: Charge during lunch hours for best availability!"
    elif any(w in message for w in ["cost", "price", "fee", "money", "rupee", "₹", "cheap", "expensive"]):
        reply = "💰 Charging Cost Breakdown:\n\n⚡ Fast Chargers (22kW+):\n• ₹12 - ₹15 per unit\n• 40kWh EV = ₹480 - ₹600 full charge\n• Time: ~45 mins for 80%\n\n🔌 Slow Chargers (<22kW):\n• ₹7 - ₹10 per unit\n• 40kWh EV = ₹280 - ₹400 full charge\n• Time: ~3-4 hours for full charge\n\n💡 Use the 💰 Cost tab for exact estimates!"
    elif any(w in message for w in ["fast", "quick", "rapid", "speed", "dc", "chademo"]):
        fast_count = sum(1 for s in stations if s["charger_type"] == "Fast")
        fast_available = sum(availability_state[s["id"]]["available_slots"] for s in stations if s["charger_type"] == "Fast")
        reply = f"⚡ Fast Charger Info:\n\n• Total fast chargers: {fast_count} stations\n• Available slots now: {fast_available}\n• Power output: 22kW - 150kW\n• Charge 0→80%: ~30-45 minutes\n\n🏆 Best fast charger available:\n{next((s['name'] for s in stations if s['charger_type']=='Fast' and availability_state[s['id']]['status']=='available'), 'Check map for availability')}\n\n💡 Tip: Fast chargers cost slightly more but save time!"
    elif any(w in message for w in ["station", "location", "where", "find", "nearby", "close"]):
        available_stations = [s["name"] for s in stations if availability_state[s["id"]]["status"] == "available"]
        reply = f"📍 Station Overview:\n\n• Total stations in Mysuru: {len(stations)}\n• Currently available: {len(available_stations)}\n• Fully occupied: {len(full_stations)}\n\n✅ Available now:\n" + "\n".join([f"  • {s}" for s in available_stations[:4]]) + f"\n\n💡 Use the 🗺️ Map tab to see all stations!"
    elif any(w in message for w in ["busy", "crowded", "full", "occupied", "congested"]):
        status_emoji = "🔴 Very busy" if occupancy_pct > 70 else "🟡 Moderately busy" if occupancy_pct > 40 else "🟢 Not busy"
        reply = f"🚦 Current Congestion:\n\n{status_emoji} — {occupancy_pct}% occupied\n\n{'⚠️ Full stations:\n' + chr(10).join(['  • ' + s for s in full_stations]) if full_stations else '✅ No stations fully booked!'}\n\n{'⏰ Peak hours — try ' + best_station['name'] if is_peak else '😊 Good time to charge!'}"
    elif any(w in message for w in ["route", "direction", "navigate", "way", "path", "go to"]):
        reply = "🗺️ Getting Directions:\n\n1️⃣ Go to 🗺️ Map tab\n2️⃣ Set your location\n3️⃣ Click any station marker\n4️⃣ Click '🛣️ Get Directions'\n5️⃣ Route appears on map!\n\nOr use 🛣️ Route tab for Dijkstra shortest path!"
    elif any(w in message for w in ["battery", "range", "km", "distance", "reach", "how far"]):
        reply = "🔋 Battery Range Tips:\n\n• Use 🔋 Battery tab to find reachable stations\n• Adjust range slider to your remaining km\n• Stations sorted by distance!\n\n⚡ General EV ranges:\n• Small EV (30kWh): ~150-200 km\n• Mid EV (40kWh): ~200-300 km\n• Large EV (60kWh): ~350-450 km\n\n💡 Charge when battery hits 20%!"
    elif any(w in message for w in ["predict", "ai", "ml", "model", "machine learning", "accuracy"]):
        reply = f"🧠 AI Model Details:\n\n• Algorithm: XGBoost Classifier\n• Accuracy: 87.3%\n• Training samples: 80,640\n• Features: 10\n\n📊 Key factors:\n1. Hour of day (32%)\n2. Peak hour (24%)\n3. Night hours (15%)\n\n🔮 Now: {'🔴 High demand' if is_peak else '🟢 Normal demand'}"
    elif any(w in message for w in ["tip", "advice", "suggest", "recommend", "help"]):
        reply = f"💡 Smart Charging Tips:\n\n1. ⏰ {'Avoid peak hours now!' if is_peak else 'Great time to charge!'}\n2. 🏆 Best now: {best_station['name']} ({best_station['slots']} slots)\n3. 🔋 Charge to 80% for battery health\n4. ⚡ Fast chargers for quick top-ups\n5. 🌙 Overnight slow charging = most cost-effective\n6. 🧠 Use AI Predict to plan ahead!"
    else:
        reply = f"🤔 Try asking about:\n• 'Which stations are free?'\n• 'Best time to charge?'\n• 'How much does charging cost?'\n• 'Get directions to station'\n\n📊 Right now: {total_available}/{total_slots} slots free — {'Peak hours 🔴' if is_peak else 'Off-peak 🟢'}"

    return jsonify({"reply": reply})

# SocketIO events
@socketio.on("connect")
def on_connect():
    print("Client connected")
    updates = []
    for s in stations:
        sid = s["id"]
        avail = availability_state[sid]
        updates.append({
            "station_id": sid,
            "available_slots": avail["available_slots"],
            "total_slots": avail["total_slots"],
            "status": avail["status"]
        })
    emit("availability_update", {"stations": updates})

@socketio.on("disconnect")
def on_disconnect():
    print("Client disconnected")

if __name__ == "__main__":
    socketio.run(app, debug=False, port=5000, use_reloader=False)