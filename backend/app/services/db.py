from __future__ import annotations
import asyncio
from sqlmodel import SQLModel, create_engine, Session
from ..core.settings import settings
from ..models.analysis import Analysis
from sqlalchemy.engine import Engine

_engine: Engine | None = None


async def init_db():
    global _engine
    if _engine is None:
        connect_args = (
            {"check_same_thread": False}
            if settings.DATABASE_URL.startswith("sqlite")
            else {}
        )
        _engine = create_engine(
            settings.DATABASE_URL, echo=False, connect_args=connect_args
        )

        # create tables
        def _create():
            SQLModel.metadata.create_all(_engine)

        await asyncio.to_thread(_create)


async def save_analysis(
    *, content_hash: str, content_type: str, risk_score: float, classification: str
) -> None:
    if _engine is None:
        await init_db()

    def _save():
        assert _engine is not None
        with Session(_engine) as session:
            rec = Analysis(
                content_hash=content_hash,
                content_type=content_type,
                risk_score=risk_score,
                classification=classification,
            )
            session.add(rec)
            session.commit()

    await asyncio.to_thread(_save)
