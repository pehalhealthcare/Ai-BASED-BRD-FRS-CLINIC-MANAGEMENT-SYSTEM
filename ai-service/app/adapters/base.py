from abc import ABC


class BaseModelAdapter(ABC):
    adapter_name = "base"
    model_name = "unconfigured"
    model_version = "0.1.0"

    @property
    def is_available(self) -> bool:
        return True
