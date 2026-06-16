from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.utils.logger import get_logger

logger = get_logger("lab-reference-ranges")

REFERENCE_FILE_PATH = Path(__file__).resolve().parents[1] / "data" / "lab_reference_ranges.json"


def normalize_measurement_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").strip().lower()).strip()


def normalize_unit(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    normalized = normalized.replace("\u03bc", "u").replace("\u00b5", "u")
    normalized = normalized.replace(" ", "")
    return normalized


@dataclass(frozen=True)
class SelectedReferenceRange:
    canonical_name: str
    unit: str
    range_entry: dict[str, Any]

    @property
    def normal_min(self) -> float | None:
        value = self.range_entry.get("normal_min")
        return float(value) if value is not None else None

    @property
    def normal_max(self) -> float | None:
        value = self.range_entry.get("normal_max")
        return float(value) if value is not None else None

    @property
    def critical_low(self) -> float | None:
        value = self.range_entry.get("critical_low")
        return float(value) if value is not None else None

    @property
    def critical_high(self) -> float | None:
        value = self.range_entry.get("critical_high")
        return float(value) if value is not None else None


class LabReferenceRangeRepository:
    def __init__(self, file_path: Path | None = None) -> None:
        self.file_path = file_path or REFERENCE_FILE_PATH
        self._raw_data: dict[str, Any] | None = None
        self._alias_index: dict[str, str] | None = None

    def _load(self) -> dict[str, Any]:
        if self._raw_data is not None:
            return self._raw_data

        with self.file_path.open("r", encoding="utf-8") as handle:
            self._raw_data = json.load(handle)

        alias_index: dict[str, str] = {}
        for canonical_name, config in self._raw_data.items():
            alias_index[normalize_measurement_name(canonical_name)] = canonical_name
            for alias in config.get("aliases", []):
                alias_index[normalize_measurement_name(alias)] = canonical_name

        self._alias_index = alias_index
        return self._raw_data

    def has_reference_data(self) -> bool:
        try:
            return bool(self._load())
        except FileNotFoundError:
            logger.error("Lab reference range file not found: %s", self.file_path)
            return False
        except json.JSONDecodeError as exc:
            logger.error("Lab reference range file is invalid JSON: %s", exc)
            return False

    def resolve_reference(
        self,
        *,
        test_name: str,
        age: int | None,
        gender: str | None,
    ) -> SelectedReferenceRange | None:
        data = self._load()
        canonical_name = self.resolve_canonical_name(test_name)

        if not canonical_name:
            return None

        config = data.get(canonical_name, {})
        range_entry = self._select_range(config.get("ranges", []), age=age, gender=gender)
        if not range_entry:
            return None

        return SelectedReferenceRange(
            canonical_name=canonical_name,
            unit=str(config.get("unit", "")).strip(),
            range_entry=range_entry,
        )

    def resolve_canonical_name(self, test_name: str) -> str | None:
        self._load()
        return (self._alias_index or {}).get(normalize_measurement_name(test_name))

    @staticmethod
    def _select_range(
        ranges: list[dict[str, Any]],
        *,
        age: int | None,
        gender: str | None,
    ) -> dict[str, Any] | None:
        normalized_gender = (gender or "any").strip().lower()
        matching_ranges: list[dict[str, Any]] = []

        for item in ranges:
            item_gender = str(item.get("gender", "any")).strip().lower()
            if item_gender not in {"any", normalized_gender}:
                continue

            age_min = item.get("age_min")
            age_max = item.get("age_max")
            if age is not None:
                if age_min is not None and age < int(age_min):
                    continue
                if age_max is not None and age > int(age_max):
                    continue
            elif age_min is not None or age_max is not None:
                continue

            matching_ranges.append(item)

        if not matching_ranges and normalized_gender != "any":
            return LabReferenceRangeRepository._select_range(ranges, age=age, gender="any")

        if not matching_ranges:
            return None

        matching_ranges.sort(
            key=lambda item: (
                0 if str(item.get("gender", "any")).strip().lower() == normalized_gender else 1,
                int(item.get("age_min", 0)),
            )
        )
        return matching_ranges[0]
