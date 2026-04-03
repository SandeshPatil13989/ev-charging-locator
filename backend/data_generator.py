import pandas as pd
import numpy as np
import json
import random

random.seed(42)
np.random.seed(42)

with open("stations.json") as f:
    stations = json.load(f)

records = []

for station in stations:
    for day in range(7):
        for hour in range(24):
            for _ in range(60):

                is_peak = 1 if hour in [8,9,10,17,18,19,20] else 0
                is_weekend = 1 if day >= 5 else 0
                is_night = 1 if hour >= 22 or hour <= 5 else 0
                is_fast = 1 if station["charger_type"] == "Fast" else 0
                is_morning = 1 if 6 <= hour <= 9 else 0
                is_evening = 1 if 17 <= hour <= 21 else 0

                if is_night:
                    prob = 0.98
                elif is_peak and is_fast and is_weekend:
                    prob = 0.05
                elif is_peak and is_fast:
                    prob = 0.08
                elif is_peak and not is_fast:
                    prob = 0.20
                elif is_morning and not is_weekend:
                    prob = 0.30
                elif is_evening and not is_weekend:
                    prob = 0.25
                elif is_weekend and not is_peak:
                    prob = 0.60
                elif not is_peak and not is_weekend:
                    prob = 0.92
                else:
                    prob = 0.70

                noise = np.random.normal(0, 0.02)
                prob = max(0.02, min(0.99, prob + noise))
                available = int(random.random() < prob)

                records.append({
                    "station_id": station["id"],
                    "hour": hour,
                    "day_of_week": day,
                    "is_peak_hour": is_peak,
                    "is_weekend": is_weekend,
                    "is_night": is_night,
                    "is_morning": is_morning,
                    "is_evening": is_evening,
                    "charger_type": is_fast,
                    "total_slots": station["total_slots"],
                    "available": available
                })

df = pd.DataFrame(records)
df.to_csv("charging_data.csv", index=False)
print(f"✅ Dataset created: {len(df):,} records saved to charging_data.csv")