"""
Topic Modelling — FR-D2 / §10.3.
Discovers student confusion themes from interaction logs.

Usage:
    python topics.py --export-dir ../data/exports --output report/
"""

import argparse
from pathlib import Path
import pandas as pd


def run(export_dir: Path, output_dir: Path, n_topics: int = 10, seed: int = 42):
    output_dir.mkdir(parents=True, exist_ok=True)

    events = pd.read_parquet(export_dir / "chat_events.parquet")
    # Use raw_query where available; fall back to topic tag
    has_query = events["raw_query"].notna() & (events["raw_query"] != "")
    docs = events.loc[has_query, "raw_query"].tolist()

    if len(docs) < 20:
        print("Insufficient consented queries for topic modelling — using topic tags.")
        # Fall back to frequency analysis of topic tags
        freq = (
            events.groupby(["topic"])
            .size()
            .reset_index(name="count")
            .sort_values("count", ascending=False)
        )
        freq.to_csv(output_dir / "topic_frequency.csv", index=False)
        print(freq.to_string())
        return freq

    try:
        from bertopic import BERTopic
        from sklearn.feature_extraction.text import CountVectorizer

        vectorizer = CountVectorizer(
            ngram_range=(1, 2),
            stop_words=None,        # Thai doesn't use English stopwords
            min_df=2,
        )
        topic_model = BERTopic(
            language="multilingual",
            nr_topics=n_topics,
            vectorizer_model=vectorizer,
            calculate_probabilities=False,
            verbose=True,
            seed_topic_list=None,
        )
        topics, _ = topic_model.fit_transform(docs)
        topic_info = topic_model.get_topic_info()
        topic_info.to_csv(output_dir / "topics.csv", index=False)
        topic_model.save(str(output_dir / "bertopic_model"))
        print(topic_info.head(20).to_string())
        return topic_info
    except ImportError:
        print("BERTopic not installed — running LDA fallback.")
        return _lda_fallback(docs, n_topics, seed, output_dir)


def _lda_fallback(docs, n_topics, seed, output_dir):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.decomposition import LatentDirichletAllocation

    vec = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
    X = vec.fit_transform(docs)
    lda = LatentDirichletAllocation(n_components=n_topics, random_state=seed, max_iter=20)
    lda.fit(X)

    feature_names = vec.get_feature_names_out()
    results = []
    for i, component in enumerate(lda.components_):
        top_words = [feature_names[j] for j in component.argsort()[-10:][::-1]]
        results.append({"topic": i, "top_words": ", ".join(top_words)})
        print(f"Topic {i}: {', '.join(top_words)}")

    pd.DataFrame(results).to_csv(output_dir / "topics_lda.csv", index=False)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--export-dir", type=Path, default=Path("../data/exports"))
    parser.add_argument("--output",     type=Path, default=Path("report"))
    parser.add_argument("--n-topics",   type=int,  default=10)
    parser.add_argument("--seed",       type=int,  default=42)
    args = parser.parse_args()
    run(args.export_dir, args.output, args.n_topics, args.seed)
