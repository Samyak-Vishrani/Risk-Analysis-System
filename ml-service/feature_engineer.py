import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

CURRENCY_MAX = {
    "USD": 5000,
    "INR": 200000,
    "EUR": 4000,
    "GBP": 3500,
    "JPY": 300000,
    "AED": 15000,
}

USD_RATES = {
    "USD": 1.0,
    "INR": 0.012,
    "EUR": 1.08,
    "GBP": 1.27,
    "JPY": 0.0067,
    "AED": 0.27,
}


class FeatureEngineer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = X.copy()

        X["amount_ratio"] = X.apply(
            lambda r: r["amount"] / CURRENCY_MAX.get(r["currency"], 5000), axis=1
        ).clip(0, 1)

        X["spend_to_income"] = (X["amount"] / (X["customer_income"] + 1)).clip(0, 1)
        X["device_new"] = (X["device_age_days"] < 1).astype(int)
        X["device_week"] = (X["device_age_days"] < 7).astype(int)
        X["account_new"] = (X["account_age_days"] < 30).astype(int)
        X["is_weekend"] = X["tx_dow"].isin([0, 6]).astype(int)
        X["is_late_night"] = X["tx_hour"].between(0, 5).astype(int)

        return X


class ExtendedFeatureEngineer(FeatureEngineer):
    def __init__(self, skewed_cols=None, outlier_thresholds=None):
        self.skewed_cols = skewed_cols or []
        self.outlier_thresholds = outlier_thresholds or {}

    def transform(self, X):
        # run base FeatureEngineer first
        X = super().transform(X)

        X["amount_usd"] = X.apply(
            lambda r: r["amount"] * USD_RATES.get(r["currency"], 1.0), axis=1
        )

        X["is_high_amount"] = X.apply(
            lambda r: int(r["amount"] > self.outlier_thresholds.get(r["currency"], float("inf"))),
            axis=1
        )

        for col in self.skewed_cols:
            if col in X.columns:
                X[f"{col}_log"] = np.log1p(X[col])

        return X