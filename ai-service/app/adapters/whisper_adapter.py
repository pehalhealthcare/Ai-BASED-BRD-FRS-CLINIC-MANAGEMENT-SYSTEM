from __future__ import annotations

import contextlib
import wave
from pathlib import Path

from app.adapters.base import BaseModelAdapter
from app.models.adapter_result import AdapterResult


class WhisperAdapter(BaseModelAdapter):
    adapter_name = "whisper_adapter"
    model_version = "phase-17-stt-0.1.0"

    def __init__(
        self,
        *,
        provider: str,
        enable_stt: bool,
        enable_fallbacks: bool,
        model_size: str,
        device: str,
        compute_type: str,
        api_key: str = "",
    ):
        self.provider = (provider or "faster_whisper").strip().lower()
        self.enable_stt = enable_stt
        self.enable_fallbacks = enable_fallbacks
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.api_key = api_key or ""
        self.model_name = self.provider if self.provider else "unconfigured-stt"
        self._model = None
        self._load_error: str | None = None

    @property
    def is_available(self) -> bool:
        if not self.enable_stt:
            return False
        return self.provider in {"mock", "placeholder", "faster_whisper", "whisper", "openai", "openrouter"}

    def _estimate_duration_seconds(self, file_path: Path) -> float:
        if file_path.suffix.lower() != ".wav":
            return 0.0

        try:
            with contextlib.closing(wave.open(str(file_path), "rb")) as handle:
                frames = handle.getnframes()
                rate = handle.getframerate() or 1
                return round(frames / float(rate), 2)
        except Exception:
            return 0.0

    def _load_faster_whisper(self):
        if self._model is not None:
            return self._model

        if self._load_error:
            raise RuntimeError(self._load_error)

        try:
            # pyrefly: ignore [missing-import]
            from faster_whisper import WhisperModel
        except Exception as exc:  # pragma: no cover - depends on optional package
            self._load_error = f"faster-whisper dependency is unavailable: {exc}"
            raise RuntimeError(self._load_error) from exc

        try:
            self._model = WhisperModel(self.model_size, device=self.device, compute_type=self.compute_type)
            return self._model
        except Exception as exc:  # pragma: no cover - depends on runtime model files
            self._load_error = f"Whisper model could not be loaded: {exc}"
            raise RuntimeError(self._load_error) from exc

    def transcribe(self, *, file_path: str, language: str = "auto") -> AdapterResult:
        path = Path(file_path)
        normalized_language = None if language in {None, "", "auto"} else language

        fallback_output = {
            "transcript": "Patient presenting with mild fever and productive cough for three days. No chest pain or breathing difficulties.",
            "language": language or "auto",
            "duration_seconds": self._estimate_duration_seconds(path) or 12.5,
            "segments": [
                {"start": 0.0, "end": 6.0, "text": "Patient presenting with mild fever and productive cough for three days."},
                {"start": 6.0, "end": 12.5, "text": "No chest pain or breathing difficulties."}
            ],
            "engine": "placeholder-fallback",
            "requires_manual_review": True,
        }

        if not self.enable_stt:
            return AdapterResult(
                output={
                    "transcript": "",
                    "language": language or "auto",
                    "duration_seconds": self._estimate_duration_seconds(path),
                    "segments": [],
                    "engine": "stt-disabled",
                },
                confidence=0.0,
                explanation="Speech-to-text is disabled in configuration.",
                risk_level="low",
                model_status="unavailable",
            )

        if self.provider in {"mock", "placeholder"}:
            return AdapterResult(
                output=fallback_output,
                confidence=0.9,
                explanation="Safe placeholder transcription executed because no validated speech model is configured.",
                risk_level="low",
                model_status="fallback" if self.enable_fallbacks else "unavailable",
            )

        if self.provider in {"openai", "openrouter"} or (self.api_key and self.provider in {"faster_whisper", "whisper"}):
            import httpx
            try:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                with open(str(path), "rb") as audio_file:
                    files = {"file": (path.name, audio_file, "application/octet-stream")}
                    data = {"model": "whisper-1"}
                    if normalized_language:
                        data["language"] = normalized_language
                    
                    with httpx.Client(timeout=60.0) as client:
                        res = client.post("https://api.openai.com/v1/audio/transcriptions", headers=headers, files=files, data=data)
                        res.raise_for_status()
                        result_json = res.json()
                        transcript = result_json.get("text", "").strip()
                        
                        return AdapterResult(
                            output={
                                "transcript": transcript,
                                "language": result_json.get("language") or language or "auto",
                                "duration_seconds": self._estimate_duration_seconds(path),
                                "segments": [],
                                "engine": "openai-whisper-api",
                                "requires_manual_review": True,
                            },
                            confidence=0.98 if transcript else 0.0,
                            explanation="Speech-to-text transcription generated using OpenAI Whisper API.",
                            risk_level="low",
                            model_status="available",
                        )
            except Exception as exc:
                if self.enable_fallbacks:
                    return AdapterResult(
                        output=fallback_output,
                        confidence=0.8,
                        explanation=f"OpenAI Whisper API failed ({exc}). Fallback mock transcript generated.",
                        risk_level="low",
                        model_status="fallback",
                    )
                else:
                    return AdapterResult(
                        output={
                            "transcript": "",
                            "language": language or "auto",
                            "duration_seconds": self._estimate_duration_seconds(path),
                            "segments": [],
                            "engine": "openai-whisper-api-error",
                            "requires_manual_review": True,
                        },
                        confidence=0.0,
                        explanation=f"OpenAI Whisper API failed: {exc}",
                        risk_level="low",
                        model_status="unavailable",
                    )

        if self.provider not in {"faster_whisper", "whisper"}:
            return AdapterResult(
                output=fallback_output if self.enable_fallbacks else {
                    "transcript": "",
                    "language": language or "auto",
                    "duration_seconds": self._estimate_duration_seconds(path),
                    "segments": [],
                    "engine": "unsupported-provider",
                },
                confidence=0.8 if self.enable_fallbacks else 0.0,
                explanation=f"Configured STT provider '{self.provider}' is not supported in this build.",
                risk_level="low",
                model_status="fallback" if self.enable_fallbacks else "unavailable",
            )

        try:
            model = self._load_faster_whisper()
        except RuntimeError as exc:
            if self.enable_fallbacks:
                return AdapterResult(
                    output=fallback_output,
                    confidence=0.8,
                    explanation=f"faster-whisper failed to load ({exc}). Fallback mock transcript generated.",
                    risk_level="low",
                    model_status="fallback",
                )
            return AdapterResult(
                output={
                    "transcript": "",
                    "language": language or "auto",
                    "duration_seconds": self._estimate_duration_seconds(path),
                    "segments": [],
                    "engine": "unavailable",
                    "requires_manual_review": True,
                },
                confidence=0.0,
                explanation=str(exc),
                risk_level="low",
                model_status="unavailable",
            )

        try:
            segments, info = model.transcribe(str(path), language=normalized_language)
            normalized_segments = []
            transcript_parts = []
            confidence_values = []

            for segment in segments:
                text = (segment.text or "").strip()
                if not text:
                    continue
                normalized_segments.append(
                    {
                        "start": round(float(getattr(segment, "start", 0.0) or 0.0), 2),
                        "end": round(float(getattr(segment, "end", 0.0) or 0.0), 2),
                        "text": text,
                    }
                )
                transcript_parts.append(text)
                avg_logprob = getattr(segment, "avg_logprob", None)
                if avg_logprob is not None:
                    confidence_values.append(max(0.0, min(1.0, 1 + (float(avg_logprob) / 5))))

            duration = round(float(getattr(info, "duration", 0.0) or 0.0), 2) or self._estimate_duration_seconds(path)
            detected_language = getattr(info, "language", None) or language or "auto"
            confidence = round(sum(confidence_values) / len(confidence_values), 2) if confidence_values else 0.0

            return AdapterResult(
                output={
                    "transcript": " ".join(transcript_parts).strip(),
                    "language": detected_language,
                    "duration_seconds": duration,
                    "segments": normalized_segments,
                    "engine": "faster-whisper",
                    "requires_manual_review": True,
                },
                confidence=confidence,
                explanation="Speech-to-text transcription generated for doctor review.",
                risk_level="low",
                model_name=self.provider,
                model_status="available",
            )
        except Exception as exc:  # pragma: no cover - model runtime failures depend on local env
            if self.enable_fallbacks:
                return AdapterResult(
                    output=fallback_output,
                    confidence=0.8,
                    explanation=f"Speech-to-text runtime failed ({exc}). Fallback mock transcript generated.",
                    risk_level="low",
                    model_status="fallback",
                )
            return AdapterResult(
                output={
                    "transcript": "",
                    "language": language or "auto",
                    "duration_seconds": self._estimate_duration_seconds(path),
                    "segments": [],
                    "engine": "runtime-error",
                    "requires_manual_review": True,
                },
                confidence=0.0,
                explanation=f"Speech-to-text runtime failed: {exc}",
                risk_level="low",
                model_status="fallback" if self.enable_fallbacks else "unavailable",
            )
