from __future__ import annotations
import logging
import time
import uuid
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .core.settings import settings
from .routers.analyze import router as analyze_router
from .services.db import init_db

# Structured logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("phishguard.api")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        start = time.perf_counter()
        # attach to state
        request.state.request_id = request_id
        response: Response | None = None
        try:
            response = await call_next(request)
            return response
        finally:
            dur_ms = (time.perf_counter() - start) * 1000
            status_code = (
                getattr(response, "status_code", None) if response is not None else None
            )
            # Minimal structured log with no PII (do not log body)
            logger.info(
                json.dumps(
                    {
                        "event": "request",
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "status": status_code,
                        "duration_ms": round(dur_ms, 2),
                    }
                )
            )
            if response is not None:
                response.headers["x-request-id"] = request_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB and model service
    await init_db()
    # Warm-up model
    try:
        from .services.model import get_model_service

        svc = get_model_service()
        await svc.warmup()
    except Exception as e:
        logger.warning(json.dumps({"event": "model_warmup_failed", "error": str(e)}))
    yield


app = FastAPI(lifespan=lifespan, title="PhishGuard API", version="0.1.0")
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple health route
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# Routers
app.include_router(analyze_router, prefix="/api")
