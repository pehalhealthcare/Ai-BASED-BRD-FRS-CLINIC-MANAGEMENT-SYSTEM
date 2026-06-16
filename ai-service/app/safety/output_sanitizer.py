import re


REPLACEMENTS = {
    "confirmed diagnosis": "possible condition",
    "you definitely have": "you may have",
    "take this medicine": "consult a doctor for treatment",
    "start antibiotics": "consult a doctor before any antibiotic treatment",
    "take 500 mg": "consult a doctor for medication advice",
}


def remove_unsafe_claims(text: str) -> str:
    sanitized = text

    for unsafe, replacement in REPLACEMENTS.items():
        sanitized = re.sub(re.escape(unsafe), replacement, sanitized, flags=re.IGNORECASE)

    return sanitized
