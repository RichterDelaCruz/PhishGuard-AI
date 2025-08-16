from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException, Request, Response
from starlette.responses import JSONResponse
from ..schemas import AnalyzeRequest, AnalyzeResponse, Indicator
from ..services.preprocess import preprocess_email
from ..services import model as model_module
from ..services.db import save_analysis

router = APIRouter()
logger = logging.getLogger("phishguard.api")

TEXT_SIZE_LIMIT = 2 * 1024 * 1024  # 2MB

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, request: Request):
    if req.type != "email":
        raise HTTPException(status_code=400, detail="Only type=email is supported in Phase 1")

    # Size guard
    if len(req.content.encode("utf-8")) > TEXT_SIZE_LIMIT:
        raise HTTPException(status_code=413, detail="Payload too large")

    # Preprocess
    try:
        cleaned, content_hash = await preprocess_email(req.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Inference
    svc = model_module.get_model_service()
    try:
        result = await svc.infer(cleaned)
    except Exception as e:
        logger.error("inference_failed", extra={"request_id": request.state.request_id, "error": str(e)})
        raise HTTPException(status_code=500, detail="Inference failed")

    # Persist
    try:
        await save_analysis(content_hash=content_hash, content_type="email", risk_score=result.risk_score, classification=result.classification)
    except Exception as e:
        logger.error("persistence_failed", extra={"request_id": request.state.request_id, "error": str(e)})

    response = JSONResponse(content={
        "risk_score": result.risk_score,
        "classification": result.classification,
        "indicators": result.indicators,
    })
    response.headers["x-request-id"] = request.state.request_id
    return response
