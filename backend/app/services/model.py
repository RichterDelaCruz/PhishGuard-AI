from __future__ import annotations
import asyncio
import os
from dataclasses import dataclass
from typing import List
from ..core.settings import settings

LABELS = ["safe", "suspicious", "phishing"]


@dataclass
class InferenceResult:
    risk_score: float
    classification: str
    indicators: List[dict]


class ModelService:
    def __init__(self):
        self._loaded = False
        self._tokenizer = None
        self._model = None
        self._torch = None

    async def warmup(self):
        if not self._loaded:
            await asyncio.to_thread(self._load)

    def _load(self):
        # Enforce real model load from configured path
        try:
            from transformers import (  # type: ignore
                AutoTokenizer,
                AutoModelForSequenceClassification,
            )
        except Exception as e:
            raise RuntimeError(
                "transformers is required to load the email model"
            ) from e
        try:
            import torch  # type: ignore
        except Exception as e:
            raise RuntimeError(
                "PyTorch is required to run the email model. "
                "Install torch for your platform."
            ) from e
        path = settings.EMAIL_MODEL_PATH
        if not os.path.isdir(path):
            raise RuntimeError(
                f"EMAIL_MODEL_PATH does not exist or is not a directory: {path}"
            )
        self._tokenizer = AutoTokenizer.from_pretrained(path)
        self._model = AutoModelForSequenceClassification.from_pretrained(path)
        self._model.eval()
        # Configure threads for better local latency predictability
        try:
            cpu_cnt = os.cpu_count() or 1
            torch.set_num_threads(max(1, min(4, cpu_cnt)))
            torch.set_num_interop_threads(1)
        except Exception:
            pass
        self._torch = torch
        self._loaded = True
        # simple warmup
        toks = self._tokenizer("test", return_tensors="pt")
        with torch.inference_mode():
            _ = self._model(**toks)

    async def infer(self, text: str, timeout_s: float = 0.5) -> InferenceResult:
        async def _infer_task():
            if not self._loaded:
                await self.warmup()
            assert self._tokenizer is not None and self._model is not None
            toks = await asyncio.to_thread(
                self._tokenizer,
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
            )
            torch = self._torch
            assert torch is not None
            with torch.inference_mode():
                outputs = await asyncio.to_thread(self._model, **toks)
            logits = outputs.logits[0]
            probs = torch.softmax(logits, dim=-1).tolist()
            num_labels = len(probs)
            # risk as weighted score towards phishing
            phishing_prob = (
                probs[LABELS.index("phishing")]
                if num_labels >= 3
                else float(probs[1] if num_labels == 2 else 1 - probs[0])
            )
            # classification
            idx = int(torch.argmax(logits).item())
            if num_labels == 2:
                classification = "phishing" if idx == 1 else "safe"
            else:
                classification = (
                    LABELS[idx]
                    if idx < len(LABELS)
                    else ("phishing" if phishing_prob > 0.66 else "safe")
                )
            # Heuristic indicators MVP
            indicators = []
            lower = text.lower()
            if any(
                k in lower for k in ["password", "verify", "urgent", "account", "login"]
            ):
                indicators.append(
                    {
                        "kind": "keyword",
                        "detail": "suspicious terms present",
                        "score": 0.2,
                    }
                )
            if "http://" in lower:
                indicators.append(
                    {"kind": "link", "detail": "insecure link detected", "score": 0.3}
                )
            return InferenceResult(
                risk_score=float(phishing_prob),
                classification=classification,
                indicators=indicators,
            )

        return await asyncio.wait_for(_infer_task(), timeout=timeout_s)


_service: ModelService | None = None


def get_model_service() -> ModelService:
    global _service
    if _service is None:
        _service = ModelService()
    return _service
