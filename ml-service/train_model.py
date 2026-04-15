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

from feature_engineer import FeatureEngineer, ExtendedFeatureEngineer, CURRENCY_MAX, USD_RATES

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
from xgboost import XGBClassifier


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("training.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)
eda_log = logging.getLogger("eda")
eda_log.setLevel(logging.INFO)
eda_log.addHandler(logging.FileHandler("eda_logs.txt"))
eda_log.propagate = False

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


# CURRENCY_MAX = {
#     "USD": 5000,
#     "INR": 200000,
#     "EUR": 4000,
#     "GBP": 3500, 
#     "JPY": 300000,
#     "AED": 15000,
# }

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

# class FeatureEngineer(BaseEstimator, TransformerMixin):
#     def fit(self, X, y=None):
#         return self

#     def transform(self, X):
#         X = X.copy()

#         X["amount_ratio"] = X.apply(
#             lambda r: r["amount"] / CURRENCY_MAX.get(r["currency"], 5000), axis=1
#         ).clip(0, 1)

#         # CHANGED: fixed formula - +1 should be inside denominator to avoid division issues
#         X["spend_to_income"] = (X["amount"] / (X["customer_income"] + 1)).clip(0, 1)

#         X["device_new"] = (X["device_age_days"]  <  1).astype(int)
#         X["device_week"] = (X["device_age_days"]  <  7).astype(int)
#         X["account_new"] = (X["account_age_days"] < 30).astype(int)
#         X["is_weekend"] = X["tx_dow"].isin([0, 6]).astype(int)
#         X["is_late_night"] = X["tx_hour"].between(0, 5).astype(int)

#         return X


# EDA
def convert_to_usd(df):
    df["amount_usd"] = df.apply(
        lambda r: r["amount"] * USD_RATES.get(r["currency"], 1.0), axis=1
    )
    return df

def clean_data(df):
    before = len(df)

    df = df.dropna()
    df = df.drop_duplicates(subset=["transaction_id"])

    df = df[df["amount"] > 0]
    df = df[df["customer_age"] >= 18]
    df = df[df["customer_income"] > 0]
    df = df[df["device_age_days"] >= 0]
    df = df[df["account_age_days"] >= 0]

    after = len(df)
    log.info(f"Cleaning: {before:,} → {after:,} rows (removed {before - after:,})")
    return df


SKEW_THRESHOLD = 1.0
def run_eda(df):
    eda_log.info("=" * 60)
    eda_log.info(f"EDA run at {datetime.utcnow().isoformat()}")
    eda_log.info("=" * 60)

    eda_log.info(f"Shape: {df.shape}")

    missing = df.isnull().sum()
    missing = missing[missing > 0]
    if len(missing) == 0:
        eda_log.info("Missing values: none")
    else:
        eda_log.info(f"Missing values:\n{missing.to_string()}")

    legit_count = int((df["is_fraud"] == False).sum())
    fraud_count = int((df["is_fraud"] == True).sum())
    scale_pos_weight = legit_count / fraud_count
    eda_log.info(f"Class distribution - legit: {legit_count:,} | fraud: {fraud_count:,}")
    eda_log.info(f"Fraud rate: {df['is_fraud'].mean()*100:.2f}%")
    eda_log.info(f"scale_pos_weight for XGBoost: {scale_pos_weight:.4f}")

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["is_fraud", "tx_hour", "tx_dow"]]

    skewness = df[numeric_cols].skew().sort_values(ascending=False)
    eda_log.info("\nSkewness of numeric features:")
    for col, skew in skewness.items():
        flag = " ← will log transform" if abs(skew) > SKEW_THRESHOLD else ""
        eda_log.info(f"  {col:<25} skew: {skew:>8.4f}{flag}")

    skewed_cols = skewness[abs(skewness) > SKEW_THRESHOLD].index.tolist()

    # outlier thresholds - 95th percentile per currency on original amount
    outlier_thresholds = {}
    for currency in df["currency"].unique():
        p95 = df.loc[df["currency"] == currency, "amount"].quantile(0.95)
        outlier_thresholds[currency] = round(float(p95), 2)

    eda_log.info("\n95th percentile thresholds per currency:")
    for currency, threshold in outlier_thresholds.items():
        eda_log.info(f"  {currency}: {threshold:,.2f}")

    eda_log.info("\nCorrelation with is_fraud:")
    correlations = (
        df[numeric_cols + ["is_fraud"]]
        .corr()["is_fraud"]
        .drop("is_fraud")
        .sort_values(ascending=False)
    )
    for col, corr in correlations.items():
        eda_log.info(f"  {col:<25} corr: {corr:>8.4f}")

    eda_log.info("\namount_usd stats by fraud label:")
    stats = df.groupby("is_fraud")["amount_usd"].describe()
    eda_log.info(f"\n{stats.to_string()}")

    eda_log.info("=" * 60)

    return {
        "scale_pos_weight":   scale_pos_weight,
        "skewed_cols":        skewed_cols,
        "outlier_thresholds": outlier_thresholds,
        "fraud_count":        fraud_count,
        "legit_count":        legit_count,
    }



def build_pipeline(scale_pos_weight, skewed_cols, outlier_thresholds):
    log_cols = [f"{col}_log" for col in skewed_cols]

    numeric_features = [
        "amount_usd", "amount_ratio", "merchant_risk",
        "customer_age", "customer_income", "spend_to_income",
        "device_age_days", "account_age_days",
        "tx_hour", "tx_dow",
    ] + log_cols

    categorical_features = [
        "currency", "merchant_category", "merchant_country", "device_type",
    ]

    binary_features = [
        "device_new", "device_week", "account_new",
        "is_weekend", "is_late_night", "is_high_amount",
    ]
    numeric_transformer = Pipeline([
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline([
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer([
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features),
        ("bin", "passthrough", binary_features),
    ])

    clf = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="auc",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )

    pipeline = Pipeline([
        ("feature_engineer", ExtendedFeatureEngineer(
            skewed_cols=skewed_cols,
            outlier_thresholds=outlier_thresholds,
        )),
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


# change model only if it is aleast 0.2% better
IMPROVEMENT_THRESHOLD = 0.002

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
            f"NEW CHAMPION promoted - AUC {new_auc:.4f} "
            f"(was {champion_auc:.4f}) → {MODEL_PATH}"
        )
        return True
    else:
        log.info(
            f"Model NOT promoted - AUC {new_auc:.4f} did not beat "
            f"champion {champion_auc:.4f} by >{IMPROVEMENT_THRESHOLD}"
        )
        return False


def main():
    log.info("In main function of train_model")

    engine = get_engine()
    df = fetch_data(engine)
    engine.dispose()
    print(df.shape)
    print(df.head())

    df = clean_data(df)
    df = convert_to_usd(df)

    # EDA
    eda_findings = run_eda(df)
    scale_pos_weight = eda_findings["scale_pos_weight"]
    skewed_cols = eda_findings["skewed_cols"]
    outlier_thresholds = eda_findings["outlier_thresholds"]

    log.info(f"EDA complete - skewed cols detected: {skewed_cols}")
    log.info(f"scale_pos_weight: {scale_pos_weight:.4f}")

    # df = feature_engineer(df)
    df = df.drop(columns=["transaction_id"])

    X = df.drop(columns = ["is_fraud"])
    y = df["is_fraud"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    log.info(f"Train: {len(X_train):,}  Test: {len(X_test):,}")

    pipeline = build_pipeline(scale_pos_weight, skewed_cols, outlier_thresholds)

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
    log.info(f"Model saved to: {MODEL_PATH}")
    metrics["promoted"] = promoted
    append_metrics(metrics)

    log.info(f"Metrics: {json.dumps(metrics, indent=2)}")
    log.info("Training Complete")


if __name__ == "__main__":
    main()