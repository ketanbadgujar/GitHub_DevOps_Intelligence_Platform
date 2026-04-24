import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
from loguru import logger

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', 'models', 'pr_risk_model.pkl'
)
SCALER_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', 'models', 'pr_risk_scaler.pkl'
)

FEATURES = [
    "additions", "deletions", "changed_files", "commits_count",
    "comments_count", "review_comments_count", "is_draft",
    "hour_of_day", "day_of_week", "is_weekend",
    "author_total_prs", "author_merge_rate", "author_avg_additions",
    "review_count", "approved_count", "changes_requested_count",
    "label_count"
]


class PRRiskModel:
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
                logger.info("PR risk model loaded from disk")
        except Exception as e:
            logger.warning(f"Could not load model: {e}")

    def train(self, df: pd.DataFrame) -> dict:
        df_clean = df.dropna(subset=FEATURES + ["has_failed_run"])

        if len(df_clean) < 20:
            raise ValueError(
                f"Not enough training data: {len(df_clean)} samples. Need at least 20."
            )

        X = df_clean[FEATURES].fillna(0)
        y = df_clean["has_failed_run"]

        positive_rate = y.mean()
        logger.info(
            f"Training data: {len(X)} samples, "
            f"{positive_rate:.1%} positive (failed runs)"
        )

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if y.sum() > 1 else None
        )

        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        scale_pos_weight = max(1, (y == 0).sum() / max((y == 1).sum(), 1))

        self.model = XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            eval_metric="logloss",
            verbosity=0
        )

        self.model.fit(X_train_scaled, y_train)

        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)

        logger.info(f"Model trained — accuracy: {accuracy:.3f}")
        logger.info(f"\n{classification_report(y_test, y_pred, zero_division=0)}")

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)

        self.is_trained = True
        self.trained_at = datetime.now(timezone.utc)
        self.training_samples = len(X_train)

        return {
            "samples_used": len(X_train),
            "features_used": FEATURES,
            "training_accuracy": round(accuracy, 4),
            "trained_at": self.trained_at
        }

    def predict(self, pr_features: dict) -> dict:
        if not self.is_trained:
            return {
                "risk_score": 0.5,
                "risk_label": "Unknown",
                "risk_factors": ["Model not trained yet"]
            }

        X = pd.DataFrame([pr_features])[FEATURES].fillna(0)
        X_scaled = self.scaler.transform(X)

        prob = self.model.predict_proba(X_scaled)[0][1]

        if prob >= 0.7:
            label = "High Risk"
        elif prob >= 0.4:
            label = "Medium Risk"
        else:
            label = "Low Risk"

        risk_factors = []
        if pr_features.get("changed_files", 0) > 10:
            risk_factors.append(f"Large PR: {pr_features['changed_files']} files changed")
        if pr_features.get("is_draft", 0):
            risk_factors.append("PR is still a draft")
        if pr_features.get("author_merge_rate", 1) < 0.5:
            risk_factors.append("Author has low merge rate historically")
        if pr_features.get("is_weekend", 0):
            risk_factors.append("Opened on weekend")
        if pr_features.get("changes_requested_count", 0) > 0:
            risk_factors.append(
                f"Has {pr_features['changes_requested_count']} change requests"
            )
        if pr_features.get("review_count", 0) == 0:
            risk_factors.append("No reviews yet")
        if not risk_factors:
            risk_factors.append("No significant risk factors detected")

        return {
            "risk_score": round(float(prob), 4),
            "risk_label": label,
            "risk_factors": risk_factors
        }


pr_risk_model = PRRiskModel()
