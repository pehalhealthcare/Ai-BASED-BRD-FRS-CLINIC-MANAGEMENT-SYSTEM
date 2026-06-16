from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator


NO_SHOW_STATUS_VALUES = ("attended", "no_show", "cancelled")


class NoShowPredictionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    patient_id: str = Field(..., min_length=1)
    appointment_date: str | None = None
    appointment_time: str | None = None
    weekday: str | None = None
    doctor_id: str | None = None
    department: str | None = None
    booking_source: str = Field(default="reception", validation_alias=AliasChoices("booking_source", "booking_channel"))
    previous_visits: int = Field(default=0, ge=0, validation_alias=AliasChoices("previous_visits", "previous_appointments"))
    previous_no_shows: int = Field(default=0, ge=0, validation_alias=AliasChoices("previous_no_shows", "missed_appointments"))
    previous_cancellations: int = Field(default=0, ge=0, validation_alias=AliasChoices("previous_cancellations", "cancelled_appointments"))
    lead_time_hours: float | None = Field(default=None, ge=0)
    reminder_sent: bool | None = None
    payment_status: str = "unknown"
    status: Literal["attended", "no_show", "cancelled"] | None = None
    is_first_visit: bool | None = None
    confirmation_status: str | None = None
    appointment_id: str | None = None

    @model_validator(mode="after")
    def validate_appointment_fields(self):
        if not self.appointment_time:
            raise ValueError("appointment_time is required.")
        return self

    def resolved_datetime(self) -> datetime | None:
        value = (self.appointment_time or "").strip()

        if not value:
            return None

        try:
            if "T" in value:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

        if self.appointment_date:
            try:
                return datetime.fromisoformat(f"{self.appointment_date}T{value}:00")
            except ValueError:
                return None

        return None

    def resolved_weekday(self) -> str:
        if self.weekday:
            return self.weekday.lower()

        resolved = self.resolved_datetime()
        if resolved:
            return resolved.strftime("%A").lower()

        return "unknown"

    def resolved_hour(self) -> int:
        if self.appointment_time:
            time_value = self.appointment_time.strip()

            if "T" in time_value:
                resolved = self.resolved_datetime()
                if resolved:
                    return resolved.hour
            else:
                try:
                    return int(time_value.split(":")[0])
                except (ValueError, IndexError):
                    return 0

        return 0

    def resolved_lead_time_hours(self) -> float:
        if self.lead_time_hours is not None:
            return float(self.lead_time_hours)

        resolved = self.resolved_datetime()
        if not resolved:
            return 0.0

        delta = resolved - datetime.utcnow().replace(tzinfo=resolved.tzinfo)
        return max(0.0, round(delta.total_seconds() / 3600, 2))

    def resolved_reminder_sent(self) -> bool:
        if self.reminder_sent is not None:
            return bool(self.reminder_sent)

        confirmation = (self.confirmation_status or "").strip().lower()
        return confirmation == "confirmed"

    def resolved_is_first_visit(self) -> bool:
        if self.is_first_visit is not None:
            return bool(self.is_first_visit)

        return self.previous_visits == 0


class NoShowTrainingRecord(NoShowPredictionRequest):
    status: Literal["attended", "no_show", "cancelled"]


class NoShowTrainingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    records: list[NoShowTrainingRecord] = Field(default_factory=list, min_length=1)
    test_size: float = Field(default=0.2, gt=0.0, lt=0.5)
    random_seed: int = 42


class NoShowTrainingResponse(BaseModel):
    success: bool = True
    rows_received: int
    rows_used_for_training: int
    rows_excluded_cancelled: int
    rows_excluded_invalid: int
    model_name: str
    model_version: str
    model_status: Literal["available", "insufficient_data", "unavailable"]
    metrics: dict
    saved_files: dict[str, str]
    summary: str


NoShowRequest = NoShowPredictionRequest
