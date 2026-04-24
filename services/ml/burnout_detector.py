import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from loguru import logger

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', 'models', 'burnout_model.pkl'
)
SCALER_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', 'models', 'burnout_scaler.pkl'
)

FEATURES = [
    "avg_weekly_prs", "recent_weekly_prs",
    "avg_weekly_reviews", "recent_weekly_reviews",
    "avg_weekly_commits", "recent_weekly_commits",
    "avg_active_days", "recent_active_days"
]


class BurnoutDetector:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.is_trained = False
        self.trained_at = None
        self.training_samples = 0
        self._load()

    def _load(self):
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
                self.model = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
                self.is_trained = True
                logger.info("Burnout model loaded from disk")
        except Exception as e:
            logger.warning(f"Could not load burnout model: {e}")

    def train(self, df: pd.DataFrame) -> dict:
        df_clean = df.dropna(subset=FEATURES)

        if len(df_clean) < 5:
            raise ValueError(
                f"Not enough contributors to train: {len(df_clean)}. Need at least 5."
            )

        X = df_clean[FEATURES].fillna(0)

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        contamination = min(0.15, max(0.05, 1 / len(df_clean)))

        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42
        )
        self.model.fit(X_scaled)

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)

        self.is_trained = True
        self.trained_at = datetime.now(timezone.utc)
        self.training_samples = len(X)

        predictions = self.model.predict(X_scaled)
        anomaly_count = (predictions == -1).sum()
        logger.info(
            f"Burnout model trained on {len(X)} contributors, "
            f"{anomaly_count} anomalies detected"
        )

        return {
            "samples_used": len(X),
            "features_used": FEATURES,
            "anomalies_detected": int(anomaly_count),
            "trained_at": self.trained_at
        }

    def predict(self, contributor_features: dict) -> dict:
        if not self.is_trained:
            return {
                "burnout_risk": False,
                "anomaly_score": 0.0,
                "health_label": "Unknown — model not trained"
            }

        X = pd.DataFrame([contributor_features])[FEATURES].fillna(0)
        X_scaled = self.scaler.transform(X)

        prediction = self.model.predict(X_scaled)[0]
        score = self.model.decision_function(X_scaled)[0]
        normalised_score = float(1 / (1 + np.exp(score)))

        burnout_risk = prediction == -1

        pr_drop = (
            contributor_features.get("avg_weekly_prs", 0) > 0 and
            contributor_features.get("recent_weekly_prs", 0) <
            contributor_features.get("avg_weekly_prs", 0) * 0.5
        )

        review_drop = (
            contributor_features.get("avg_weekly_reviews", 0) > 0 and
            contributor_features.get("recent_weekly_reviews", 0) <
            contributor_features.get("avg_weekly_reviews", 0) * 0.5
        )

        if burnout_risk and (pr_drop or review_drop):
            health_label = "At Risk"
        elif burnout_risk:
            health_label = "Anomalous"
        elif normalised_score > 0.6:
            health_label = "Watch"
        else:
            health_label = "Healthy"

        return {
            "burnout_risk": burnout_risk,
            "anomaly_score": round(normalised_score, 4),
            "health_label": health_label
        }


burnout_detector = BurnoutDetector()
