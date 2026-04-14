from dotenv import load_dotenv
load_dotenv()

import os
import sys
import pandas as pd
import joblib
import logging
from sqlalchemy import create_engine, text

# feature_engineer.py is in the same folder — import so joblib can resolve the class
from feature_engineer import FeatureEngineer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "fraud_model.pkl")

DB_URL = (
    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

BATCH_SIZE = 5000

def classify_risk(prob: float) -> str:
    if prob > 0.85: return "CRITICAL"
    if prob > 0.65: return "HIGH"
    if prob > 0.35: return "MEDIUM"
    return "LOW"

def main():
    log.info("Loading model...")
    model = joblib.load(MODEL_PATH)
    log.info(f"Model loaded from: {MODEL_PATH}")

    # verify correct pipeline before touching the DB
    steps = [name for name, _ in model.steps]
    log.info(f"Pipeline steps: {steps}")
    if "feature_engineer" not in steps:
        raise RuntimeError("Model is missing feature_engineer step. Retrain first.")

    engine = create_engine(DB_URL)

    query = """
        SELECT
            t.transaction_id,
            t.amount,
            t.currency,
            EXTRACT(HOUR FROM t.transaction_time)                      AS tx_hour,
            EXTRACT(DOW  FROM t.transaction_time)                      AS tx_dow,
            m.risk_rating                                              AS merchant_risk,
            m.category                                                 AS merchant_category,
            m.country                                                  AS merchant_country,
            c.age                                                      AS customer_age,
            c.income                                                   AS customer_income,
            EXTRACT(DAY FROM (t.transaction_time - c.account_created)) AS account_age_days,
            EXTRACT(DAY FROM (t.transaction_time - d.registered_at))   AS device_age_days,
            d.device_type
        FROM transactions t
        JOIN merchants m ON t.merchant_id = m.merchant_id
        JOIN customers c ON t.customer_id = c.customer_id
        JOIN devices   d ON t.device_id   = d.device_id
        LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
        WHERE r.transaction_id IS NULL
    """

    log.info("Fetching unscored transactions...")
    df = pd.read_sql(query, engine)
    total = len(df)
    log.info(f"Found {total:,} unscored transactions")

    if total == 0:
        log.info("Nothing to backfill — risk_scores is already complete")
        engine.dispose()
        return

    scored = 0
    for start in range(0, total, BATCH_SIZE):
        batch          = df.iloc[start : start + BATCH_SIZE].copy()
        transaction_ids = batch["transaction_id"].tolist()

        input_df = batch.drop(columns=["transaction_id"])

        probas = model.predict_proba(input_df)[:, 1]

        rows = [
            {
                "transaction_id":    transaction_ids[i],
                "fraud_probability": round(float(probas[i]), 4),
                "risk_level":        classify_risk(float(probas[i])),
            }
            for i in range(len(transaction_ids))
        ]

        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO risk_scores (transaction_id, fraud_probability, risk_level, scored_at)
                    VALUES (:transaction_id, :fraud_probability, :risk_level, NOW())
                    ON CONFLICT (transaction_id) DO NOTHING
                """),
                rows
            )

        scored += len(rows)
        log.info(f"Progress: {scored:,} / {total:,}")

    log.info(f"Backfill complete — {scored:,} transactions scored")
    engine.dispose()

if __name__ == "__main__":
    main()