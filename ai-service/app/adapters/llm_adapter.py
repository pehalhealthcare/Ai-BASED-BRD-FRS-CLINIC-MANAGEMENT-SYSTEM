import json
import re
import httpx

from app.adapters.base import BaseModelAdapter
from app.core.department_mapping import map_to_department
from app.core.medical_safety import get_clinical_disclaimer
from app.core.red_flags import derive_risk_level, detect_red_flags
from app.safety.guardrails import sanitize_medical_output


def _likelihood_from_confidence(value: float) -> str:
    if value >= 0.8:
        return "high"
    if value >= 0.55:
        return "medium"
    return "low"


def _symptom_conditions(symptom_text: str) -> list[dict[str, str]]:
    text = symptom_text.lower()
    matches = []

    if any(term in text for term in ["fever", "cough", "sore throat"]):
        matches.append(
            {
                "condition": "Viral upper respiratory infection",
                "likelihood": "medium",
                "reason": "Fever, cough, and sore throat commonly fit a viral upper respiratory pattern.",
            }
        )
    if any(term in text for term in ["cough", "wheezing", "breathing difficulty", "shortness of breath"]):
        matches.append(
            {
                "condition": "Lower or upper airway inflammation",
                "likelihood": "medium",
                "reason": "Cough or breathing symptoms can reflect airway inflammation and need clinical review.",
            }
        )
    if "fever" in text:
        matches.append(
            {
                "condition": "Acute febrile illness",
                "likelihood": "medium",
                "reason": "Fever suggests an acute illness but needs clinical correlation for the cause.",
            }
        )
    if "chest pain" in text:
        matches.append(
            {
                "condition": "Urgent chest pain evaluation needed",
                "likelihood": "high",
                "reason": "Chest pain requires urgent medical assessment to rule out serious causes.",
            }
        )

    if not matches:
        matches.append(
            {
                "condition": "Undifferentiated symptom cluster",
                "likelihood": "low",
                "reason": "The current symptoms are non-specific and require doctor assessment.",
            }
        )

    return matches[:3]


def _diagnosis_suggestions(symptom_text: str, history_text: str) -> list[dict[str, object]]:
    text = f"{symptom_text} {history_text}".lower()
    suggestions = []

    if any(term in text for term in ["fever", "cough", "sore throat"]):
        suggestions.append(
            {
                "diagnosis": "Possible viral respiratory infection",
                "likelihood": "medium",
                "supporting_evidence": ["Fever and respiratory symptoms are present."],
                "missing_information": ["Temperature trend", "Breathing status", "Exposure history"],
                "contraindications_or_warnings": ["Rule out pneumonia or asthma exacerbation if breathing symptoms worsen."],
            }
        )

    if "chest pain" in text:
        suggestions.append(
            {
                "diagnosis": "Possible acute chest pain syndrome",
                "likelihood": "high",
                "supporting_evidence": ["Chest pain was reported."],
                "missing_information": ["Duration of pain", "Radiation", "Associated sweating or breathlessness"],
                "contraindications_or_warnings": ["Requires urgent clinical evaluation to exclude emergency causes."],
            }
        )

    if "abdominal pain" in text:
        suggestions.append(
            {
                "diagnosis": "Possible gastrointestinal or inflammatory abdominal condition",
                "likelihood": "medium",
                "supporting_evidence": ["Abdominal pain was reported."],
                "missing_information": ["Location of pain", "Vomiting or diarrhea", "Tenderness pattern"],
                "contraindications_or_warnings": ["Escalate urgently if severe pain, guarding, or persistent vomiting is present."],
            }
        )

    if not suggestions:
        suggestions.append(
            {
                "diagnosis": "Possible non-specific acute illness",
                "likelihood": "low",
                "supporting_evidence": ["Symptoms are limited or non-specific."],
                "missing_information": ["Focused symptom history", "Vitals", "Exam findings"],
                "contraindications_or_warnings": ["Doctor review is required before any diagnosis is recorded."],
            }
        )

    return suggestions[:3]


def clean_and_parse_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    match = re.search(r"({.*})", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Failed to parse JSON from LLM response: {text[:200]}")


class LLMAdapter(BaseModelAdapter):
    adapter_name = "llm_adapter"
    model_version = "phase-16-foundation-0.1.0"

    def __init__(
        self,
        *,
        provider: str,
        api_key: str,
        model_name: str,
        timeout_seconds: int,
        enable_llm: bool,
    ):
        self.provider = (provider or "").strip().lower()
        self.api_key = api_key or ""
        self.model_name = model_name or (f"{self.provider}-default" if self.provider else "llm-unconfigured")
        self.timeout_seconds = timeout_seconds
        self.enable_llm = enable_llm

    @property
    def is_available(self) -> bool:
        if not self.enable_llm:
            return False

        if self.provider == "mock":
            return True

        if self.provider in {"openai", "openrouter", "gemini", "anthropic"} and self.api_key:
            return True

        return False

    def _openai_compatible_base_url(self) -> str:
        if self.provider == "openrouter" or self.api_key.startswith("sk-or-"):
            return "https://openrouter.ai/api/v1"
        if self.model_name and "/" in self.model_name and not self.model_name.startswith("gpt-"):
            return "https://openrouter.ai/api/v1"
        return "https://api.openai.com/v1"

    def generate_medical_response(self, system_prompt: str, user_prompt: str) -> dict:
        if not self.enable_llm:
            raise RuntimeError("LLM is disabled")

        if self.provider == "mock":
            if user_prompt.startswith("image_path:"):
                return {
                    "name": "Rahul Sharma",
                    "gender": "male",
                    "dob": "1999-05-12",
                    "age": 27,
                    "phone": "9876543210",
                    "email": "rahul.sharma@example.com",
                    "address": "123 Street, New Delhi, 110001",
                    "aadhaar_like_number": "123412341234",
                    "document_id": None,
                    "guardian_name": None
                }
            payload = json.loads(user_prompt)
            task = payload.get("task")
            data = payload.get("payload", {})
            if task == "symptom_check":
                return self._mock_symptom_response(data)
            if task == "diagnosis_assist":
                return self._mock_diagnosis_response(data)
            raise ValueError(f"Unsupported mock medical task: {task}")

        if self.provider in {"openai", "openrouter"}:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            base_url = self._openai_compatible_base_url()
            default_model = "openrouter/free" if base_url.endswith("openrouter.ai/api/v1") else "gpt-4o-mini"
            
            if user_prompt.startswith("image_path:"):
                img_path = user_prompt.replace("image_path:", "").strip()
                import base64
                from pathlib import Path
                try:
                    with open(img_path, "rb") as image_file:
                        base64_image = base64.b64encode(image_file.read()).decode("utf-8")
                    suffix = Path(img_path).suffix.lower()
                    mime_type = "image/png" if suffix == ".png" else "image/jpeg"
                    user_content = [
                        {
                            "type": "text",
                            "text": "Extract all patient registration fields from this government ID image."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                except Exception as e:
                    user_content = f"Failed to read image for vision: {e}"
            else:
                user_content = user_prompt

            body = {
                "model": self.model_name or default_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]
            }
            with httpx.Client(timeout=self.timeout_seconds) as client:
                res = client.post(f"{base_url}/chat/completions", headers=headers, json=body)
                res.raise_for_status()
                content = res.json()["choices"][0]["message"]["content"]
                return clean_and_parse_json(content)

        elif self.provider == "gemini":
            model = self.model_name or "gemini-1.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            headers = {"Content-Type": "application/json"}
            body = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"{system_prompt}\n\nInput Data:\n{user_prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            with httpx.Client(timeout=self.timeout_seconds) as client:
                res = client.post(url, headers=headers, json=body)
                res.raise_for_status()
                content = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                return clean_and_parse_json(content)

        elif self.provider == "anthropic":
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            body = {
                "model": self.model_name or "claude-3-5-sonnet-20241022",
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            }
            with httpx.Client(timeout=self.timeout_seconds) as client:
                res = client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
                res.raise_for_status()
                content = res.json()["content"][0]["text"]
                return clean_and_parse_json(content)

        raise RuntimeError("No supported LLM provider is configured")

    def _mock_symptom_response(self, payload: dict) -> dict:
        symptom_text = payload.get("symptoms", "")
        age = payload.get("age")
        gender = payload.get("gender")
        known_conditions = payload.get("known_conditions") or []

        red_flags = detect_red_flags(symptoms_text=symptom_text, age=age, gender=gender, known_conditions=known_conditions)
        top_conditions = _symptom_conditions(symptom_text)
        department = map_to_department(
            symptom_text=symptom_text,
            candidate_conditions=[item["condition"] for item in top_conditions],
            age=age,
        )

        response = {
            "clinical_summary": f"Symptoms reported: {symptom_text.strip() or 'Not provided'}",
            "top_3_possible_conditions": top_conditions,
            "recommended_department": department,
            "red_flags": red_flags,
            "home_care_general_advice": [
                "Stay hydrated.",
                "Rest.",
                "Monitor symptoms and temperature.",
            ],
            "when_to_seek_emergency_care": [
                "Seek urgent care if breathing difficulty, chest pain, confusion, fainting, or persistent high fever occurs."
            ],
            "follow_up_questions": [
                "Do you have shortness of breath?",
                "What is your temperature?",
                "Are your symptoms getting worse or staying the same?",
            ],
            "disclaimer": get_clinical_disclaimer(),
        }
        response["risk_level"] = derive_risk_level(red_flags) if red_flags else "medium"
        response["confidence"] = 0.78 if top_conditions and top_conditions[0]["likelihood"] == "high" else 0.68
        response["explanation"] = (
            f"Mock LLM provider generated structured symptom guidance using the medical safety prompt within {self.timeout_seconds} seconds."
        )

        return sanitize_medical_output(response)

    def _mock_diagnosis_response(self, payload: dict) -> dict:
        symptom_text = payload.get("symptoms", "")
        age = payload.get("age")
        gender = payload.get("gender")
        history_text = payload.get("history_text", "")
        known_conditions = payload.get("known_conditions") or []
        vitals = payload.get("vitals") or {}
        doctor_notes = payload.get("doctor_notes", "")
        lab_summary = payload.get("lab_summary", "")

        red_flags = detect_red_flags(
            symptoms_text=symptom_text,
            age=age,
            gender=gender,
            known_conditions=known_conditions,
            history_text=history_text,
            vitals=vitals,
            doctor_notes=doctor_notes,
            lab_summary=lab_summary,
        )
        suggestions = _diagnosis_suggestions(symptom_text, history_text)
        department = map_to_department(
            symptom_text=symptom_text,
            candidate_conditions=[item["diagnosis"] for item in suggestions],
            age=age,
        )

        response = {
            "clinical_summary": f"Assistive summary: {symptom_text.strip() or 'Symptoms not specified clearly'}",
            "top_3_diagnosis_suggestions": suggestions,
            "recommended_next_questions": [
                "What is the time course of symptoms?",
                "Are there any red-flag symptoms such as chest pain, confusion, or severe breathing difficulty?",
                "What recent vitals or exam findings are available?",
            ],
            "recommended_department": department,
            "red_flags": red_flags,
            "doctor_action_required": [
                "Review AI suggestions.",
                "Confirm diagnosis clinically.",
                "Approve or reject before saving.",
            ],
            "disclaimer": "Clinical decision support only. Not a final diagnosis.",
        }
        response["risk_level"] = derive_risk_level(red_flags) if red_flags else "medium"
        response["confidence"] = 0.72 if suggestions and suggestions[0]["likelihood"] == "high" else 0.64
        response["explanation"] = (
            f"Mock LLM provider generated structured doctor-assist output using the medical safety prompt within {self.timeout_seconds} seconds."
        )

        return sanitize_medical_output(response)
