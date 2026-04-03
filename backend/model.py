import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

print("📊 Loading dataset...")
df = pd.read_csv("charging_data.csv")

X = df[["station_id", "hour", "day_of_week", "is_peak_hour",
        "is_weekend", "is_night", "is_morning", "is_evening",
        "charger_type", "total_slots"]]
y = df["available"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"✅ Dataset: {len(df):,} samples")
print(f"   Train: {len(X_train):,} | Test: {len(X_test):,}")
print(f"   Features: {X.shape[1]}")
print(f"\n🔄 Training XGBoost model...")

model = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print(f"\n{'='*45}")
print(f"✅ Model Accuracy: {acc * 100:.2f}%")
print(f"{'='*45}")
print(classification_report(y_test, y_pred))

joblib.dump(model, "model.pkl")
print("✅ Model saved as model.pkl")
print("🚀 Ready for production!")