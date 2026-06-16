from __future__ import annotations

import json
import sys

from app.services.billing_anomaly_service import evaluate_billing_predictions


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python -m app.evaluation.billing_anomaly_eval <path-to-json-or-csv>")
        return 1

    summary = evaluate_billing_predictions(sys.argv[1])
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
