from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import uuid as _uuid

class Analysis(SQLModel, table=True):
    __tablename__ = "analyses"
    id: str | None = Field(default_factory=lambda: str(_uuid.uuid4()), primary_key=True)
    content_hash: str = Field(index=True)
    content_type: str = Field(index=True)
    risk_score: float
    classification: str
    created_at: datetime | None = Field(default_factory=datetime.utcnow, index=True)
