"""
General-purpose Polymarket market finder with pagination.

Step 1 (skeleton): wire up CLI and helpers; do not make HTTP calls yet.

Usage examples:
  python scripts/find_markets.py --keywords Fed bps --max-matches 3 --max-pages 100
  python scripts/find_markets.py --keywords oil --max-matches 5
"""

from __future__ import annotations
import argparse
from market_parity.io.markets import find_markets


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


def render_match(question: str, condition_id: str, status: str, end_date: str) -> None:
    """Pretty-print a found market."""
    print("Question:", question)
    print("Condition ID:", condition_id)
    print("Status:", status)
    print("End Date:", end_date)
    print("-" * 72)


def main() -> None:
    args = parse_args()
    
    # Call the imported find_markets function
    results = find_markets(
        keywords=args.keywords,
        max_matches=args.max_matches,
        max_pages=args.max_pages
    )
    
    # Print results
    for market in results:
        render_match(
            question=market["question"],
            condition_id=market["condition_id"],
            status=market["status"],
            end_date=market["end_date"]
        )
    
    if not results:
        print(f"No markets found containing: {args.keywords}")


if __name__ == "__main__":
    main()
