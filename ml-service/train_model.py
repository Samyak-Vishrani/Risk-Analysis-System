from dotenv import load_dotenv
import os
import json
import logging
import warnings
from datetime import datetime
warnings.filterwarnings("ignore")
load_dotenv()

import numpy as np
import pandas as pd
import joblib

from sqlalchemy import create_engine

from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score
)
from sklearn.utils import class_weight


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("training.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "fraud_model.pkl")
METRICS_LOG_PATH = os.path.join(BASE_DIR, "metrics_history.json")
CHAMPION_META_PATH = os.path.join(BASE_DIR, "champion_meta.json")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD")
}

def get_engine():
    try:
        engine = create_engine(
            f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
        )
        print("Connected to database (SQLAlchemy)")
        return engine
    except Exception as e:
        print("Database connection failed:", e)
        exit()

def fetch_data(engine):
    query="""
    SELECT
        t.transaction_id,
        t.amount,
        t.currency,
        t.location,
        t.is_fraud,
        EXTRACT(HOUR FROM t.transaction_time)   AS tx_hour,
        EXTRACT(DOW  FROM t.transaction_time)   AS tx_dow,

        m.risk_rating     AS merchant_risk,
        m.category        AS merchant_category,
        m.country         AS merchant_country,

        c.age             AS customer_age,
        c.income          AS customer_income,
        EXTRACT(DAY FROM (t.transaction_time - c.account_created)) AS account_age_days,

        EXTRACT(DAY FROM (t.transaction_time - d.registered_at))   AS device_age_days,
        d.device_type
    FROM transactions t
    JOIN merchants m ON t.merchant_id = m.merchant_id
    JOIN customers  c ON t.customer_id = c.customer_id
    JOIN devices    d ON t.device_id   = d.device_id
    """

    try:
        df = pd.read_sql(query, engine)
        print("Data fetch success")
        return df
    except Exception as e:
        print("Error fetching data", e)
        exit()


CURRENCY_MAX = {
    "USD": 5000,
    "INR": 200000,
    "EUR": 4000,
    "GBP": 3500, 
    "JPY": 300000,
    "AED": 15000,
}

# def feature_engineer(df):
#     # normalize amount based on max currency (keep in between 0 and 1)
#     df["amount_ratio"] = df.apply(
#         lambda r: r["amount"] / CURRENCY_MAX.get(r["currency"], 5000), axis = 1
#     ).clip(0, 1)

#     # how large is spend to income ratio
#     df["spend_to_income"] = (df["amount"] / (df["customer_income"] + 1)).clip(0, 1)

#     # how new is the device
#     df["device_new"]  = (df["device_age_days"]  <  1).astype(int)
#     df["device_week"] = (df["device_age_days"]  <  7).astype(int)

#     # account newness
#     df["account_new"] = (df["account_age_days"] < 30).astype(int)

#     # weekend flag
#     df["is_weekend"] = df["tx_dow"].isin([0, 6]).astype(int)

#     # late-night flag (midnight–5am)
#     df["is_late_night"] = df["tx_hour"].between(0, 5).astype(int)

#     df = df.drop(columns=["transaction_id"])

#     return df

class FeatureEngineer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = X.copy()

        X["amount_ratio"] = X.apply(
            lambda r: r["amount"] / CURRENCY_MAX.get(r["currency"], 5000), axis=1
        ).clip(0, 1)

        # CHANGED: fixed formula — +1 should be inside denominator to avoid division issues
        X["spend_to_income"] = (X["amount"] / (X["customer_income"] + 1)).clip(0, 1)

        X["device_new"] = (X["device_age_days"]  <  1).astype(int)
        X["device_week"] = (X["device_age_days"]  <  7).astype(int)
        X["account_new"] = (X["account_age_days"] < 30).astype(int)
        X["is_weekend"] = X["tx_dow"].isin([0, 6]).astype(int)
        X["is_late_night"] = X["tx_hour"].between(0, 5).astype(int)

        return X


NUMERIC_FEATURES = [
    "amount", "amount_ratio", "merchant_risk",
    "customer_age", "customer_income", "spend_to_income",
    "device_age_days", "account_age_days",
    "tx_hour", "tx_dow",
]

CATEGORICAL_FEATURES = [
    "currency", "merchant_category", "merchant_country", "device_type", 
    # "location",
]

BINARY_FEATURES = [
    "device_new", "device_week", "account_new", "is_weekend", "is_late_night",
]

def build_pipeline(class_weights):
    numeric_transformer = Pipeline([
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline([
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer([
        ("num", numeric_transformer, NUMERIC_FEATURES),
        ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ("bin", "passthrough", BINARY_FEATURES),
    ])

    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=5,
        class_weight=class_weights,
        random_state=42,
        n_jobs=-1,
    )

    pipeline = Pipeline([
        ("feature_engineer", FeatureEngineer()),
        ("preprocessor", preprocessor),
        ("classifier", clf),
    ])
    
    return pipeline


# def evaluate(pipeline, X_test, y_test):
#     y_pred  = pipeline.predict(X_test)
#     y_proba = pipeline.predict_proba(X_test)[:, 1]

#     print("\n── Classification Report ──────────────────────────")
#     print(classification_report(y_test, y_pred, target_names=["Legit","Fraud"]))
#     print(f"ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}")

#     # Confusion matrix
#     fig, axes = plt.subplots(1, 2, figsize=(12, 4))

#     ConfusionMatrixDisplay.from_predictions(
#         y_test, y_pred,
#         display_labels=["Legit","Fraud"],
#         ax=axes[0]
#     )
#     axes[0].set_title("Confusion matrix")

#     # ROC curve
#     fpr, tpr, _ = roc_curve(y_test, y_proba)
#     axes[1].plot(fpr, tpr, label=f"AUC = {roc_auc_score(y_test, y_proba):.3f}")
#     axes[1].plot([0,1],[0,1],"--", color="gray")
#     axes[1].set_xlabel("False positive rate")
#     axes[1].set_ylabel("True positive rate")
#     axes[1].set_title("ROC curve")
#     axes[1].legend()

#     plt.tight_layout()
#     plt.savefig("evaluation.png", dpi=120)
#     plt.show()
#     print("Evaluation saved → evaluation.png")


def calc_metrics(pipeline, X_test, y_test, cv_scores):
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    
    metrics = {
        "run_at":          datetime.utcnow().isoformat(),
        "test_size":       len(y_test),
        "fraud_count":     int(y_test.sum()),
        "roc_auc":         round(roc_auc_score(y_test, y_proba), 4),
        "precision_fraud": round(precision_score(y_test, y_pred), 4),
        "recall_fraud":    round(recall_score(y_test, y_pred), 4),
        "f1_fraud":        round(f1_score(y_test, y_pred), 4),
        "cv_auc_mean":     round(cv_scores.mean(), 4),
        "cv_auc_std":      round(cv_scores.std(), 4),
    }
    return metrics

def append_metrics(metrics):
    history = []
    if os.path.exists(METRICS_LOG_PATH):
        with open(METRICS_LOG_PATH) as f:
            history = json.load(f)
    history.append(metrics)
    with open(METRICS_LOG_PATH, "w") as f:
        json.dump(history, f, indent=2)
    log.info(f"Metrics appended → {METRICS_LOG_PATH}")


# change model only if it is aleast 0.5% better
IMPROVEMENT_THRESHOLD = 0.005

def load_champion_auc():
    if not os.path.exists(CHAMPION_META_PATH):
        return 0.0
    with open(CHAMPION_META_PATH) as f:
        meta = json.load(f)
    return meta.get("roc_auc", 0.0)

def promote_model(pipeline, metrics):
    champion_auc = load_champion_auc()
    new_auc = metrics["roc_auc"]

    if new_auc >= champion_auc + IMPROVEMENT_THRESHOLD:
        joblib.dump(pipeline, MODEL_PATH)
        with open(CHAMPION_META_PATH, "w") as f:
            json.dump(metrics, f, indent = 2)
        log.info(
            f"NEW CHAMPION promoted — AUC {new_auc:.4f} "
            f"(was {champion_auc:.4f}) → {MODEL_PATH}"
        )
        return True
    else:
        log.info(
            f"Model NOT promoted — AUC {new_auc:.4f} did not beat "
            f"champion {champion_auc:.4f} by >{IMPROVEMENT_THRESHOLD}"
        )
        return False


def main():
    log.info("In main function of train_model")

    engine = get_engine()
    df = fetch_data(engine)
    engine.dispose()

    # df = feature_engineer(df)
    df = df.drop(columns=["transaction_id"])

    X = df.drop(columns = ["is_fraud"])
    y = df["is_fraud"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    log.info(f"Train: {len(X_train):,}  Test: {len(X_test):,}")

    cw = class_weight.compute_class_weight(
        "balanced", classes = np.array([0, 1]), y = y_train
    )

    pipeline = build_pipeline({0: cw[0], 1: cw[1]})

    log.info("Training Started")
    pipeline.fit(X_train, y_train)
    log.info("Pipeline fitted")

    cv_scores = cross_val_score(
        pipeline, X_train, y_train,
        cv=StratifiedKFold(n_splits=5),
        scoring="roc_auc", n_jobs=-1
    )
    log.info(f"CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    metrics = calc_metrics(pipeline, X_test, y_test, cv_scores)
    promoted = promote_model(pipeline, metrics)
    metrics["promoted"] = promoted
    append_metrics(metrics)
    log.info(f"Metrics: {json.dumps(metrics, indent=2)}")
    log.info("Training Complete")


if __name__ == "__main__":
    main()