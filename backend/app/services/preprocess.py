from __future__ import annotations
import asyncio
import hashlib
import html
import re
from typing import Tuple

MAX_LENGTH = 5000
# Strengthen pattern to catch both "<script" and "< script"
DISALLOWED_PATTERNS = [re.compile(r"<\s*script", flags=re.IGNORECASE), re.compile(r"\{\{.?\}\}")]

async def preprocess_email(text: str) -> Tuple[str, str]:
    if text is None:
        raise ValueError("content is required")
    # Basic HTML unescape first
    cleaned = html.unescape(text)

    # Reject disallowed patterns BEFORE stripping tags
    for pat in DISALLOWED_PATTERNS:
        if pat.search(cleaned):
            raise ValueError("content contains disallowed patterns")

    # very simple tag stripper; robust HTML parsing is out-of-scope
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    cleaned = cleaned.strip()

    # Truncate
    if len(cleaned) > MAX_LENGTH:
        cleaned = cleaned[:MAX_LENGTH]

    # Hash
    content_hash = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
    return cleaned, content_hash
