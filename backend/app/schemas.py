from __future__ import annotations
from typing import Literal, List
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    content: str = Field(min_length=1)
    # Accept both values at schema level; handler will enforce Phase 1 constraint
    type: Literal["email", "url"]


class Indicator(BaseModel):
    kind: str
    detail: str
    score: float | None = None


class AnalyzeResponse(BaseModel):
    risk_score: float
    classification: Literal["phishing", "safe", "suspicious"]
    indicators: List[Indicator]
