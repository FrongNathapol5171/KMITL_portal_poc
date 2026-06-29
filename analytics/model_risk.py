"""
Early Academic-Risk Prediction Model (§10.2, FR-D4).
Headline result: AUC-ROC and PR-AUC of Full vs Baseline model.

Usage:
    python model_risk.py --features features.parquet --seed 42 --output report/
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import roc_auc_score, average_precision_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline


ACADEMIC_FEATURES = [
    "current_gpax", "current_term_gpa", "credits_earned",
    "year_level", "failed_courses_count",
]

BEHAVIOURAL_FEATURES = [
    "query_count", "anxiety_topic_share", "grade_topic_share",
    "topic_diversity", "escalation_rate", "avg_latency_ms", "active_weeks",
]

TARGET = "at_risk_next_term"


def evaluate_model(model, X, y, cv, seed: int) -> dict:
    """Run stratified k-fold CV; return mean AUC-ROC and PR-AUC."""
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=seed)
    scores = cross_validate(
        model, X, y, cv=skf,
        scoring={"roc_auc": "roc_auc", "avg_precision": "average_precision"},
        return_train_score=False,
    )
    return {
        "roc_auc_mean": float(np.mean(scores["test_roc_auc"])),
        "roc_auc_std":  float(np.std(scores["test_roc_auc"])),
        "pr_auc_mean":  float(np.mean(scores["test_avg_precision"])),
        "pr_auc_std":   float(np.std(scores["test_avg_precision"])),
        "n_samples":    len(y),
        "n_positive":   int(y.sum()),
    }


def run(features_path: Path, seed: int, cv: int, output_dir: Path):
    np.random.seed(seed)
    output_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_parquet(features_path)
    df = df.dropna(subset=[TARGET] + ACADEMIC_FEATURES)

    y = df[TARGET].astype(int)
    X_academic    = df[ACADEMIC_FEATURES].fillna(0)
    X_full        = df[ACADEMIC_FEATURES + BEHAVIOURAL_FEATURES].fillna(0)

    lr_baseline   = Pipeline([("scaler", StandardScaler()), ("clf", LogisticRegression(random_state=seed, max_iter=500))])
    lr_full       = Pipeline([("scaler", StandardScaler()), ("clf", LogisticRegression(random_state=seed, max_iter=500))])
    gb_baseline   = Pipeline([("clf", GradientBoostingClassifier(random_state=seed, n_estimators=200))])
    gb_full       = Pipeline([("clf", GradientBoostingClassifier(random_state=seed, n_estimators=200))])

    print("Evaluating models…")
    results = {
        "seed": seed, "cv_folds": cv,
        "logistic_baseline": evaluate_model(lr_baseline, X_academic, y, cv, seed),
        "logistic_full":     evaluate_model(lr_full, X_full,        y, cv, seed),
        "gb_baseline":       evaluate_model(gb_baseline, X_academic, y, cv, seed),
        "gb_full":           evaluate_model(gb_full, X_full,         y, cv, seed),
    }

    # Incremental lift (headline result — AC-5)
    lr_lift  = results["logistic_full"]["roc_auc_mean"] - results["logistic_baseline"]["roc_auc_mean"]
    gb_lift  = results["gb_full"]["roc_auc_mean"]       - results["gb_baseline"]["roc_auc_mean"]
    results["incremental_lift_lr_roc_auc"]  = round(lr_lift, 4)
    results["incremental_lift_gb_roc_auc"]  = round(gb_lift, 4)

    print(json.dumps(results, indent=2))

    with open(output_dir / "evaluation_report.json", "w") as f:
        json.dump(results, f, indent=2)

    # SHAP interpretability (AC-6)
    try:
        import shap
        gb_full.fit(X_full, y)
        explainer = shap.TreeExplainer(gb_full.named_steps["clf"])
        shap_values = explainer.shap_values(X_full)
        shap_df = pd.DataFrame(shap_values, columns=ACADEMIC_FEATURES + BEHAVIOURAL_FEATURES)
        shap_df.to_parquet(output_dir / "shap_values.parquet", index=False)
        print("SHAP values saved.")
    except ImportError:
        print("shap not installed — skipping SHAP step.")

    print(f"\nHeadline: LR incremental AUC lift (behavioural) = {lr_lift:+.4f}")
    print(f"          GB incremental AUC lift (behavioural) = {gb_lift:+.4f}")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--features", type=Path, default=Path("features.parquet"))
    parser.add_argument("--seed",     type=int,  default=42)
    parser.add_argument("--cv",       type=int,  default=5)
    parser.add_argument("--output",   type=Path, default=Path("report"))
    args = parser.parse_args()
    run(args.features, args.seed, args.cv, args.output)
