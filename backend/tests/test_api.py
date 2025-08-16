import asyncio
import json
import pytest
from httpx import AsyncClient
from fastapi import status
from backend.app.main import app

@pytest.mark.asyncio
async def test_analyze_happy_path(monkeypatch):
    # Stub model inference for speed and determinism
    from backend.app.services import model as model_module

    class DummySvc:
        async def warmup(self):
            return
        async def infer(self, text: str):
            return model_module.InferenceResult(risk_score=0.8, classification="phishing", indicators=[{"kind": "keyword", "detail": "suspicious terms", "score": 0.2}])

    monkeypatch.setattr(model_module, "get_model_service", lambda: DummySvc())

    payload = {"content": "Please verify your password at http://bad", "type": "email"}
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.post("/api/analyze", json=payload)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert 0 <= data["risk_score"] <= 1
    assert data["classification"] in ["phishing", "safe", "suspicious"]
    assert isinstance(data["indicators"], list)
    assert resp.headers.get("x-request-id")

@pytest.mark.asyncio
async def test_analyze_invalid_type():
    payload = {"content": "hello", "type": "url"}
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.post("/api/analyze", json=payload)
    assert resp.status_code == 400

@pytest.mark.asyncio
async def test_analyze_blocked_pattern():
    payload = {"content": "<script>bad()</script>", "type": "email"}
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.post("/api/analyze", json=payload)
    assert resp.status_code == 400
