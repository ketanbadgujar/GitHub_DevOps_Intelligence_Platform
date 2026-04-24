import sys
import os
from datetime import datetime, timezone
from loguru import logger

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'collector'))

from database import SessionLocal, test_connection
from feature_engineering import extract_pr_features, extract_contributor_features
from pr_risk_model import PRRiskModel
from burnout_detector import BurnoutDetector


def train_all_models(repo_full_name: str):
    logger.info(f"Starting model training for {repo_full_name}")

    if not test_connection():
        logger.error("Cannot connect to database")
        return

    db = SessionLocal()

    try:
        # Train PR risk model
        logger.info("Extracting PR features...")
        pr_df = extract_pr_features(db, repo_full_name)
        logger.info(f"PR dataset: {len(pr_df)} rows, {len(pr_df.columns)} columns")
        logger.info(f"Failed run rate: {pr_df['has_failed_run'].mean():.1%}")

        model = PRRiskModel()
        result = model.train(pr_df)
        logger.info(f"PR risk model trained — accuracy: {result['training_accuracy']}")

        # Train burnout detector
        logger.info("Extracting contributor features...")
        contributor_df = extract_contributor_features(db, repo_full_name)
        logger.info(f"Contributor dataset: {len(contributor_df)} rows")

        detector = BurnoutDetector()
        burnout_result = detector.train(contributor_df)
        logger.info(
            f"Burnout model trained — "
            f"{burnout_result['anomalies_detected']} anomalies detected"
        )

        logger.info("=" * 50)
        logger.info("Training Complete")
        logger.info("=" * 50)
        logger.info(f"PR Risk Model — {result['samples_used']} training samples")
        logger.info(f"Burnout Model — {burnout_result['samples_used']} contributors")
        logger.info("Models saved to /models directory")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import os
    repo = os.getenv("GITHUB_TARGET_REPO", "fastapi/fastapi")
    train_all_models(repo)
    