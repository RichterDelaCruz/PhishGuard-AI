from __future__ import annotations
import asyncio
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
        # Lazy imports to keep tests light if model deps aren't installed
        from transformers import AutoTokenizer, AutoModelForSequenceClassification  # type: ignore
        import torch  # type: ignore
        path = settings.EMAIL_MODEL_PATH
        self._tokenizer = AutoTokenizer.from_pretrained(path)
        self._model = AutoModelForSequenceClassification.from_pretrained(path)
        self._model.eval()
        self._torch = torch
        self._loaded = True
        # simple warmup
        toks = self._tokenizer("test", return_tensors="pt")
        with torch.no_grad():
            _ = self._model(**toks)

    async def infer(self, text: str, timeout_s: float = 0.5) -> InferenceResult:
        async def _infer_task():
            if not self._loaded:
                await self.warmup()
            assert self._tokenizer is not None and self._model is not None
            toks = await asyncio.to_thread(self._tokenizer, text, return_tensors="pt", truncation=True, max_length=512)
            torch = self._torch
            assert torch is not None
            with torch.no_grad():
                outputs = await asyncio.to_thread(self._model, **toks)
            logits = outputs.logits[0]
            probs = torch.softmax(logits, dim=-1).tolist()
            # risk as weighted score towards phishing
            phishing_prob = probs[LABELS.index("phishing")] if len(probs) >= 3 else float(1 - probs[0])
            # classification as argmax
            idx = int(torch.argmax(logits).item())
            classification = LABELS[idx] if idx < len(LABELS) else ("phishing" if phishing_prob > 0.66 else "safe")
            # Heuristic indicators MVP
            indicators = []
            lower = text.lower()
            if any(k in lower for k in ["password", "verify", "urgent", "account", "login"]):
                indicators.append({"kind": "keyword", "detail": "suspicious terms present", "score": 0.2})
            if "http://" in lower:
                indicators.append({"kind": "link", "detail": "insecure link detected", "score": 0.3})
            return InferenceResult(risk_score=float(phishing_prob), classification=classification, indicators=indicators)

        return await asyncio.wait_for(_infer_task(), timeout=timeout_s)

_service: ModelService | None = None

def get_model_service() -> ModelService:
    global _service
    if _service is None:
        _service = ModelService()
    return _service
