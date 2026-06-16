import json
from pathlib import Path

from app.core.settings import get_settings


def get_no_show_model_dir() -> Path:
    settings = get_settings()
    return Path(settings.no_show_model_dir)


def ensure_no_show_model_dir() -> Path:
    model_dir = get_no_show_model_dir()
    model_dir.mkdir(parents=True, exist_ok=True)
    return model_dir


def get_no_show_model_paths() -> dict[str, Path]:
    model_dir = get_no_show_model_dir()
    return {
        "model_dir": model_dir,
        "model": model_dir / "no_show_xgboost.pkl",
        "preprocessor": model_dir / "no_show_preprocessor.json",
        "metadata": model_dir / "metadata.json",
        "metrics": model_dir / "metrics.json",
    }


def read_no_show_metadata() -> dict:
    metadata_path = get_no_show_model_paths()["metadata"]

    if not metadata_path.exists():
        return {}

    try:
        return json.loads(metadata_path.read_text(encoding="utf-8"))
    except Exception:
        return {}
