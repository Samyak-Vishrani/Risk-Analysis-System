from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import joblib
import pandas as pd
import os

app = FastAPI(
    title="Fraud Detection ML Service",
    version="1.0.0"
)

MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(os.path.dirname(__file__),  "..", "fraud_model.pkl"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "1.0.0")

try:
    model = joblib.load(MODEL_PATH)
    print(f"Model loaded from {MODEL_PATH}")
except FileNotFoundError:
    raise RuntimeError(f"Model file not found at {MODEL_PATH}. Train the model first.")



class TransactionInput(BaseModel):
    transaction_id: int
    amount: float
    currency: str
    tx_hour: int
    tx_dow: int
    merchant_risk: float
    merchant_category: str
    merchant_country: str
    customer_age: int
    customer_income: float
    account_age_days: float
    device_age_days: float
    device_type: str


def classify_risk(prob: float) -> str:
    if prob > 0.85: return "CRITICAL"
    if prob > 0.65: return "HIGH"
    if prob > 0.35: return "MEDIUM"
    return "LOW"

def get_action(risk_level: str) -> str:
    return {
        "LOW": "ALLOW",
        "MEDIUM": "REVIEW",
        "HIGH": "REVIEW",
        "CRITICAL": "BLOCK",
    }[risk_level]


def get_top_factors() -> list[dict]:
    try:
        rf = model.named_steps["classifier"]
        importance = rf.feature_importances_
        prep = model.named_steps["preprocessor"]

        ohe_names = (
            prep.named_transformers_["cat"].named_steps["ohe"].get_feature_names_out(
                ["currency", "merchant_category", "merchant_country", "device_type"]
            ).tolist()
        )
        numeric_features = [
            "amount", "amount_ratio", "merchant_risk",
            "customer_age", "customer_income", "spend_to_income",
            "device_age_days", "account_age_days", "tx_hour", "tx_dow",
        ]
        binary_features = [
            "device_new", "device_week", "account_new",
            "is_weekend", "is_late_night",
        ]
        all_features = numeric_features + ohe_names + binary_features

        top_features = sorted(zip(all_features, importance), key = lambda x: x[1], reverse=True)[:5]

        return [{"feature": f, "importance": round(float(i), 4)} for f, i in top_features]

    except Exception:
        return[]
    
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "model_path": MODEL_PATH
    }

@app.post("/predict")
def predict(transaction: TransactionInput):
    try:
        input_df = pd.DataFrame([transaction.model_dump(exclude={"transaction_id"})])

        prob = float(model.predict_proba(input_df)[0][1])
        # prob = model.predict_proba(input_df)
        # print(prob)
        risk_level = classify_risk(prob)
        action = get_action(risk_level)

        return {
            "fraud_probability": round(prob, 4),
            # "fraud_probability": round(float(prob[0][1]), 4),
            "risk_level": risk_level,
            "recommended_action": action,
            "should_block": action == "BLOCK",
            "top_risk_factors": get_top_factors(),
            "transaction_id": transaction.transaction_id,
            "model_version": MODEL_VERSION,
            "scored_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))