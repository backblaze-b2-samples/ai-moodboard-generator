"""Tests for the generate-and-pin flow. The Genblaze provider call and B2
writes are monkeypatched, so these run without an OpenAI key or network."""

import pytest

from app.repo import genblaze_image
from app.repo.genblaze_image import GeneratedImage, ImageGenerationError
from app.service import boards as boards_service
from app.service import generate as generate_service


@pytest.fixture
def fake_generation(monkeypatch):
    """Replace the real provider call with a deterministic fake image and
    stub every B2 write so the orchestration is exercised end-to-end."""
    fake = GeneratedImage(
        image_bytes=b"\x89PNG fake bytes",
        media_type="image/png",
        width=1024,
        height=1024,
        sha256="deadbeef",
        manifest={"canonical_hash": "abc123", "run": {}},
        canonical_hash="abc123",
    )
    monkeypatch.setattr(generate_service, "generate_image", lambda prompt: fake)
    monkeypatch.setattr(generate_service, "upload_file", lambda b, k, ct: None)

    store: dict[str, dict] = {}
    monkeypatch.setattr(boards_service, "put_json", lambda k, d: store.__setitem__(k, d))
    monkeypatch.setattr(boards_service, "get_json", store.get)
    monkeypatch.setattr(boards_service, "public_url", lambda key: None)
    monkeypatch.setattr(
        boards_service, "get_presigned_url",
        lambda key, expires_in=600: f"https://signed/{key}",
    )
    return store


@pytest.mark.asyncio
async def test_generate_into_new_board(client, fake_generation):
    resp = await client.post(
        "/generate",
        json={"prompt": "a misty forest at dawn", "new_board_title": "Nature"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["board_slug"] == "nature"
    pin = body["pin"]
    assert pin["prompt"] == "a misty forest at dawn"
    assert pin["model"] == "gpt-image-1"
    assert pin["provider"] == "openai"
    assert pin["sha256"] == "deadbeef"
    assert pin["canonical_hash"] == "abc123"
    assert pin["image_key"] == f"boards/nature/{pin['pin_id']}.png"
    assert pin["url"] == f"https://signed/{pin['image_key']}"


@pytest.mark.asyncio
async def test_generate_fork_records_parent(client, fake_generation):
    await client.post("/generate", json={"prompt": "seed", "new_board_title": "Forks"})
    resp = await client.post(
        "/generate",
        json={"prompt": "seed remix", "board_slug": "forks", "parent_pin_id": "p0"},
    )
    assert resp.status_code == 200
    assert resp.json()["pin"]["parent_pin_id"] == "p0"


@pytest.mark.asyncio
async def test_generate_missing_board_404(client, fake_generation):
    resp = await client.post(
        "/generate", json={"prompt": "x", "board_slug": "ghost"}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_generate_requires_target(client, fake_generation):
    resp = await client.post("/generate", json={"prompt": "x"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_generate_provider_error_502(client, monkeypatch, fake_generation):
    def boom(prompt):
        raise ImageGenerationError("provider down")

    monkeypatch.setattr(generate_service, "generate_image", boom)
    resp = await client.post(
        "/generate", json={"prompt": "x", "new_board_title": "Z"}
    )
    assert resp.status_code == 502
    assert "provider down" in resp.json()["detail"]


def test_generate_image_requires_key(monkeypatch):
    """The repo adapter refuses to run without OPENAI_API_KEY rather than
    silently producing a fake image."""
    from app.config import settings

    monkeypatch.setattr(settings, "openai_api_key", "")
    with pytest.raises(ImageGenerationError):
        genblaze_image.generate_image("anything")


def test_read_asset_bytes_from_file(tmp_path):
    """The file:// branch (gpt-image-* path) reads the decoded PNG bytes."""
    from urllib.parse import quote

    p = tmp_path / "img.png"
    p.write_bytes(b"\x89PNGdata")
    url = f"file://{quote(str(p.resolve()))}"
    assert genblaze_image._read_asset_bytes(url) == b"\x89PNGdata"
