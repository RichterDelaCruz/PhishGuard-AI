import asyncio
import pytest
from backend.app.services.preprocess import preprocess_email, MAX_LENGTH

@pytest.mark.asyncio
async def test_preprocess_truncation_and_hash():
    text = "a" * (MAX_LENGTH + 50)
    cleaned, h = await preprocess_email(text)
    assert len(cleaned) == MAX_LENGTH
    assert len(h) == 64

@pytest.mark.asyncio
async def test_preprocess_blocks_script_and_template():
    with pytest.raises(ValueError):
        await preprocess_email("<script>alert(1)</script>")
    with pytest.raises(ValueError):
        await preprocess_email("Hello {{x}} world")

@pytest.mark.asyncio
async def test_preprocess_strips_html():
    cleaned, _ = await preprocess_email("<b>Hi</b> there")
    assert cleaned.startswith("Hi")
