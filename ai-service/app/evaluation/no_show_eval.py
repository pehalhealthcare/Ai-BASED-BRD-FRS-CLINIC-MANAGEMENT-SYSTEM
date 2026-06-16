from __future__ import annotations


def _safe_divide(numerator: float, denominator: float) -> float:
    if not denominator:
        return 0.0
    return numerator / denominator


def calculate_binary_metrics(y_true: list[int], y_scores: list[float], threshold: float = 0.5) -> dict[str, float | None]:
    if not y_true:
        return {
            "accuracy": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "roc_auc": None,
        }

    y_pred = [1 if score >= threshold else 0 for score in y_scores]

    true_positive = sum(1 for truth, pred in zip(y_true, y_pred) if truth == 1 and pred == 1)
    true_negative = sum(1 for truth, pred in zip(y_true, y_pred) if truth == 0 and pred == 0)
    false_positive = sum(1 for truth, pred in zip(y_true, y_pred) if truth == 0 and pred == 1)
    false_negative = sum(1 for truth, pred in zip(y_true, y_pred) if truth == 1 and pred == 0)

    accuracy = _safe_divide(true_negative + true_positive, len(y_true))
    precision = _safe_divide(true_positive, true_positive + false_positive)
    recall = _safe_divide(true_positive, true_positive + false_negative)
    f1 = _safe_divide(2 * precision * recall, precision + recall)

    positives = [score for truth, score in zip(y_true, y_scores) if truth == 1]
    negatives = [score for truth, score in zip(y_true, y_scores) if truth == 0]
    roc_auc = None

    if positives and negatives:
        wins = 0.0

        for positive in positives:
            for negative in negatives:
                if positive > negative:
                    wins += 1.0
                elif positive == negative:
                    wins += 0.5

        roc_auc = wins / (len(positives) * len(negatives))

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
    }
