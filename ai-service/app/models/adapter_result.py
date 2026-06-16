from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AdapterResult:
    output: Any
    confidence: float
    explanation: str
    risk_level: str = "unknown"
    model_status: str = "placeholder"
