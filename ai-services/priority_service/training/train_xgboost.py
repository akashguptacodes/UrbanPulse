"""
Production Training Pipeline for UrbanPulse Priority Scoring using XGBoost.
Usage:
    python train_xgboost.py
"""
import os
import sys
import csv
import json
from pathlib import Path

# Add service root to path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

from app.features.extractor import FeatureExtractor

def load_dataset(csv_path: Path):
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    X = []
    y = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            features = FeatureExtractor.extract_features(
                title=row["title"],
                description=row["description"],
                category=row["primary_category"],
                disaster_type=row.get("disaster_type") or None
            )
            score = float(row["severity_score"])
            X.append(features)
            y.append(score)

    return X, y

def train_and_export():
    try:
        import xgboost as xgb
    except ImportError:
        print("[ERROR] xgboost is not installed. Please install it using: pip install xgboost")
        return

    # Check for 5,000 sample dataset first, fallback to 1,000 if not found
    data_path_5000 = SERVICE_ROOT / "data" / "priority_training_dataset_5000.csv"
    data_path_1000 = SERVICE_ROOT / "data" / "priority_training_dataset_1000.csv"
    data_path = data_path_5000 if data_path_5000.exists() else data_path_1000

    artifact_dir = SERVICE_ROOT / "app" / "models" / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_output_file = artifact_dir / "priority_xgb.json"

    print(f"Loading training data from: {data_path}")
    X, y = load_dataset(data_path)
    total_samples = len(X)
    print(f"Loaded {total_samples} samples with {len(X[0])} features each.")

    # Reproducible shuffle before 80/20 train/test split
    import random
    combined = list(zip(X, y))
    random.seed(42)
    random.shuffle(combined)
    X, y = zip(*combined)
    X, y = list(X), list(y)

    split_idx = int(total_samples * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    print(f"Training set: {len(X_train)} samples | Test set: {len(X_test)} samples")

    feature_names = FeatureExtractor.feature_names()
    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feature_names)
    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=feature_names)

    params = {
        "objective": "reg:squarederror",
        "eval_metric": ["rmse", "mae"],
        "max_depth": 5,
        "eta": 0.07,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "seed": 42
    }

    evals = [(dtrain, "train"), (dtest, "eval")]
    print("\nTraining XGBoost Regressor on dataset...")
    bst = xgb.train(
        params,
        dtrain,
        num_boost_round=150,
        evals=evals,
        verbose_eval=30
    )

    # Evaluate on test set
    preds = bst.predict(dtest)
    mae = sum(abs(p - actual) for p, actual in zip(preds, y_test)) / len(y_test)
    mse = sum((p - actual) ** 2 for p, actual in zip(preds, y_test)) / len(y_test)
    rmse = mse ** 0.5

    print(f"\n--- Model Test Metrics ---")
    print(f"  MAE (Mean Absolute Error): {mae:.2f} points (on 0-100 scale)")
    print(f"  RMSE:                     {rmse:.2f} points")

    # Export model to native JSON
    bst.save_model(str(model_output_file))
    print(f"\n[SUCCESS] Model artifact exported to: {model_output_file}")

    # Export feature importance
    importance = bst.get_score(importance_type="gain")
    sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    imp_file = artifact_dir / "feature_importance.json"
    with open(imp_file, "w", encoding="utf-8") as f:
        json.dump(dict(sorted_importance), f, indent=2)
    print(f"Feature importance saved to: {imp_file}")

if __name__ == "__main__":
    train_and_export()

