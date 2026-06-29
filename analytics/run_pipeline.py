"""
One-command analytics pipeline runner (AC-8, FR-D8).
Usage: python run_pipeline.py --seed 42
"""

import argparse, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).parent
EXPORTS = ROOT.parent / "data" / "exports"
REPORT  = ROOT / "report"


def run(cmd, **kwargs):
    print(f"\n>>> {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, **kwargs)
    if result.returncode != 0:
        sys.exit(result.returncode)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--students", type=int, default=300)
    args = parser.parse_args()

    # Stage 1: Generate synthetic data
    run([sys.executable, str(ROOT.parent / "data" / "generate.py"),
         "--seed", str(args.seed), "--students", str(args.students)])

    # Stage 2: Build feature matrix
    features_path = REPORT / "features.parquet"
    REPORT.mkdir(exist_ok=True)
    run([sys.executable, str(ROOT / "features.py"),
         "--export-dir", str(EXPORTS), "--output", str(features_path)])

    # Stage 3: Train & evaluate risk model
    run([sys.executable, str(ROOT / "model_risk.py"),
         "--features", str(features_path), "--seed", str(args.seed),
         "--output", str(REPORT)])

    # Stage 4: Topic modelling
    run([sys.executable, str(ROOT / "topics.py"),
         "--export-dir", str(EXPORTS), "--output", str(REPORT), "--seed", str(args.seed)])

    # Stage 5: Bottleneck detection
    run([sys.executable, str(ROOT / "bottlenecks.py"),
         "--export-dir", str(EXPORTS), "--output", str(REPORT)])

    print(f"\n✓ Pipeline complete. Outputs in {REPORT}/")
