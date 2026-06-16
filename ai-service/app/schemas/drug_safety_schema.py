from pydantic import BaseModel, Field


class DrugPatientInput(BaseModel):
    id: str | None = None
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = None
    allergies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    pregnancy_status: str | None = None
    kidney_disease: bool = False
    liver_disease: bool = False


class DrugMedicationInput(BaseModel):
    name: str = Field(..., min_length=1)
    generic_name: str | None = None
    ingredients: list[str] = Field(default_factory=list)
    dosage: str | None = None
    frequency: str | None = None
    duration: str | None = None


class DrugSafetyCheckRequest(BaseModel):
    patient: DrugPatientInput
    medications: list[DrugMedicationInput] = Field(default_factory=list, min_length=1)
    existing_medications: list[DrugMedicationInput] = Field(default_factory=list)
