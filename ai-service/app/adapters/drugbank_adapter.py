from app.adapters.base import BaseModelAdapter


class DrugBankAdapter(BaseModelAdapter):
    adapter_name = "drugbank_adapter"
    model_version = "phase-19-drug-safety-0.1.0"

    def __init__(self, *, provider: str, api_key: str, base_url: str, enabled: bool):
        self.provider = (provider or "local").strip().lower()
        self.api_key = api_key or ""
        self.base_url = base_url or ""
        self.enabled = enabled
        self.model_name = "drugbank-adapter"

    @property
    def is_available(self) -> bool:
        return bool(self.enabled and self.api_key and self.base_url)

    def fetch_interaction_alerts(self, *_args, **_kwargs) -> list[dict]:
        return []
