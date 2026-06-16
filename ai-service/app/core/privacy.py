import re


def mask_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) < 4:
        return value
    if len(digits) >= 10:
        return f"{digits[:2]}XXXXXX{digits[-2:]}"
    visible_tail = digits[-2:] if len(digits) >= 2 else digits
    return f"{digits[:1]}XX{visible_tail}"


def mask_aadhaar_like_number(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) < 4:
        return "XXXX"
    return f"XXXX-XXXX-{digits[-4:]}"


def mask_email_partial(value: str) -> str:
    if "@" not in (value or ""):
        return value
    local, domain = value.split("@", 1)
    if len(local) <= 2:
        masked_local = f"{local[:1]}***"
    else:
        masked_local = f"{local[:2]}***"
    return f"{masked_local}@{domain}"


def detect_sensitive_numbers(text: str) -> list[str]:
    return re.findall(r"\b\d{4}\s?\d{4}\s?\d{4}\b", text or "")


def mask_document_id(value: str) -> str:
    compact = re.sub(r"\s+", "", value or "")
    if len(compact) <= 4:
        return f"XXXX{compact[-1:]}" if compact else "XXXX"
    return f"{'X' * max(4, len(compact) - 4)}{compact[-4:]}"
