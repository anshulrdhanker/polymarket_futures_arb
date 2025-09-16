"""
General-purpose Polymarket market finder with pagination.

Step 1 (skeleton): wire up CLI and helpers; do not make HTTP calls yet.

Usage examples:
  python scripts/find_markets.py --keywords Fed bps --max-matches 3 --max-pages 100
  python scripts/find_markets.py --keywords oil --max-matches 5
"""

from __future__ import annotations
import argparse
import requests
from datetime import datetime, timezone
from typing import Iterable, Optional

BASE_URL = "https://clob.polymarket.com/markets"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Search Polymarket markets by keyword(s) across paginated results."
    )
    parser.add_argument(
        "--keywords",
        nargs="+",
        required=True,
        help="One or more case-insensitive substrings to search in market questions.",
    )
    parser.add_argument(
        "--max-matches",
        type=int,
        default=3,
        help="Stop after collecting this many matches (default: 3).",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=100,
        help="Maximum number of pages to scan via next_cursor (default: 100).",
    )
    # Reserved for later:
    # parser.add_argument("--probe", action="store_true",
    #     help="If set, fetch the YES mid for the first result via adapters.polymarket.")
    return parser.parse_args()


def question_matches(question: str, keywords: Iterable[str]) -> bool:
    """Return True iff all keywords appear (case-insensitive) in the question."""
    q = (question or "").casefold()
    return all(k.casefold() in q for k in keywords)


def render_match(question: str, condition_id: str, status: str, end_date: str) -> None:
    """Pretty-print a found market."""
    print("Question:", question)
    print("Condition ID:", condition_id)
    print("Status:", status)
    print("End Date:", end_date)
    print("-" * 72)


def main() -> None:
    args = parse_args()
    matches = 0
    pages = 0
    cursor = None

    while pages < args.max_pages:
        url = BASE_URL if cursor is None else f"{BASE_URL}?next_cursor={cursor}"
        resp = requests.get(url)
        resp.raise_for_status()
        data = resp.json()

        markets = data.get("data", [])
        for m in markets:
            # Must be a dict and active True
            if not isinstance(m, dict) or not m.get("active", False):
                continue

            question = m.get("question", "")
            condition_id = m.get("condition_id", "")
            end_date_iso = m.get("end_date_iso")  # may be None or missing
            status = "active" if m.get("active", False) else "inactive"

            # Parse end_date_iso (if present) and apply freshness filter:
            end_dt = None
            if end_date_iso:
                try:
                    # Handle trailing 'Z'
                    end_dt = datetime.fromisoformat(end_date_iso.replace("Z", "+00:00"))
                except ValueError:
                    end_dt = None  # if parsing fails, treat as unknown

            now = datetime.now(timezone.utc)

            # Skip markets that have already expired (end_date in the past)
            if end_dt is not None and end_dt < now:
                continue

            # Optional: annotate the end date with future/past label for readability
            if end_dt is None and end_date_iso:
                end_label = f"{end_date_iso} (unknown parse)"
            elif end_dt is None and not end_date_iso:
                end_label = "N/A"
            else:
                end_label = f"{end_date_iso} ({'future' if end_dt >= now else 'past'})"

            if question_matches(question, args.keywords):
                render_match(question, condition_id, status, end_label)
                matches += 1
                if matches >= args.max_matches:
                    return

        cursor = data.get("next_cursor")
        if not cursor:
            break

        pages += 1

    if matches == 0:
        print(f"No markets found containing: {args.keywords}")


if __name__ == "__main__":
    main()
