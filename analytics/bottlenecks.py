"""
Bottleneck Detection — FR-D3 / §10.4.
Flags courses/topics with anomalously high query volume.

Usage:
    python bottlenecks.py --export-dir ../data/exports --output report/
"""

import argparse
from pathlib import Path
import pandas as pd
import numpy as np


def run(export_dir: Path, output_dir: Path, z_threshold: float = 2.0):
    output_dir.mkdir(parents=True, exist_ok=True)

    events = pd.read_parquet(export_dir / "chat_events.parquet")
    calendar = pd.read_json(
        Path(__file__).parent.parent / "data" / "seeds" / "calendar.json"
    )

    # Volume by topic
    topic_vol = (
        events.groupby("topic").size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )
    mean_vol = topic_vol["count"].mean()
    std_vol  = topic_vol["count"].std()
    topic_vol["z_score"] = (topic_vol["count"] - mean_vol) / max(std_vol, 1)
    topic_vol["is_bottleneck"] = topic_vol["z_score"] > z_threshold

    flagged = topic_vol[topic_vol["is_bottleneck"]].copy()
    flagged["recommendation"] = flagged["topic"].map({
        "withdrawal": "Improve communication around withdrawal deadlines; add proactive in-app reminders.",
        "deadline":   "Publish academic calendar more prominently; send push reminders 1 week before.",
        "grade_anxiety": "Consider mid-term grade visibility and academic counselling check-ins.",
        "thesis":     "Simplify thesis submission guide; create an FAQ page.",
        "registration": "Streamline online registration UX; add step-by-step video.",
    }).fillna("Review communication and documentation for this topic area.")

    topic_vol.to_csv(output_dir / "topic_volume.csv", index=False)
    flagged.to_csv(output_dir / "bottlenecks.csv", index=False)

    print("=== Curriculum / Communication Bottlenecks ===")
    print(flagged[["topic", "count", "z_score", "recommendation"]].to_string(index=False))
    return flagged


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--export-dir",   type=Path, default=Path("../data/exports"))
    parser.add_argument("--output",       type=Path, default=Path("report"))
    parser.add_argument("--z-threshold",  type=float, default=2.0)
    args = parser.parse_args()
    run(args.export_dir, args.output, args.z_threshold)
