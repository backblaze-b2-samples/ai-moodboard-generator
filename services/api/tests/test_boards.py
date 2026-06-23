"""Tests for the boards/pins surface — all B2 access is monkeypatched, so
these run without credentials or network."""

from datetime import UTC, datetime

import pytest

from app.service import boards as boards_service


class FakeBucket:
    """In-memory stand-in for the B2 object store used by the boards service."""

    def __init__(self):
        self.objects: dict[str, dict] = {}

    def put_json(self, key, data):
        self.objects[key] = data

    def get_json(self, key):
        return self.objects.get(key)

    def list_prefixes(self, prefix=""):
        seen = set()
        for key in self.objects:
            if key.startswith(prefix):
                rest = key[len(prefix):]
                head = rest.split("/", 1)[0]
                seen.add(f"{prefix}{head}/")
        return sorted(seen)

    def list_files(self, prefix="", max_keys=1000):
        from app.types import FileMetadata

        out = []
        for key in self.objects:
            if key.startswith(prefix):
                out.append(
                    FileMetadata(
                        key=key,
                        filename=key.rsplit("/", 1)[-1],
                        folder=prefix,
                        size_bytes=10,
                        size_human="10 B",
                        content_type="application/json",
                        uploaded_at=datetime.now(UTC),
                        url=None,
                    )
                )
        return out

    def delete_prefix(self, prefix):
        keys = [k for k in self.objects if k.startswith(prefix)]
        for k in keys:
            del self.objects[k]
        return len(keys)


@pytest.fixture
def fake_bucket(monkeypatch):
    bucket = FakeBucket()
    monkeypatch.setattr(boards_service, "put_json", bucket.put_json)
    monkeypatch.setattr(boards_service, "get_json", bucket.get_json)
    monkeypatch.setattr(boards_service, "list_prefixes", bucket.list_prefixes)
    monkeypatch.setattr(boards_service, "list_files", bucket.list_files)
    monkeypatch.setattr(boards_service, "delete_prefix", bucket.delete_prefix)
    # No public URL configured => presigned path; stub it out.
    monkeypatch.setattr(boards_service, "public_url", lambda key: None)
    monkeypatch.setattr(
        boards_service, "get_presigned_url",
        lambda key, expires_in=600: f"https://signed/{key}",
    )
    return bucket


def test_slugify():
    assert boards_service.slugify("My Cool Board!") == "my-cool-board"
    assert boards_service.slugify("  spaces  ") == "spaces"


def test_slugify_rejects_empty():
    with pytest.raises(boards_service.BoardError):
        boards_service.slugify("!!!")


def test_create_and_get_board(fake_bucket):
    board = boards_service.create_board("Mood One", "vibes")
    assert board.slug == "mood-one"
    assert board.pin_count == 0
    fetched = boards_service.get_board("mood-one")
    assert fetched.title == "Mood One"


def test_create_board_idempotent(fake_bucket):
    a = boards_service.create_board("Repeat")
    b = boards_service.create_board("Repeat")
    assert a.slug == b.slug
    assert len(fake_bucket.list_prefixes("boards/")) == 1


def test_get_missing_board_404(fake_bucket):
    with pytest.raises(boards_service.BoardError) as ei:
        boards_service.get_board("nope")
    assert ei.value.status_code == 404


def test_list_boards(fake_bucket):
    boards_service.create_board("A")
    boards_service.create_board("B")
    assert {b.slug for b in boards_service.list_boards()} == {"a", "b"}


def test_save_pin_updates_cover_and_count(fake_bucket):
    from app.types import Pin

    boards_service.create_board("Gallery")
    pin = Pin(
        pin_id="p1",
        board_slug="gallery",
        prompt="sunset",
        provider="openai",
        model="gpt-image-1",
        created_at=datetime.now(UTC).isoformat(),
        sha256="abc",
        width=1024,
        height=1024,
        media_type="image/png",
        image_key="boards/gallery/p1.png",
    )
    saved = boards_service.save_pin("gallery", pin)
    assert saved.url == "https://signed/boards/gallery/p1.png"
    board = boards_service.get_board("gallery")
    assert board.pin_count == 1
    assert board.cover_pin_id == "p1"


def test_share_board_presigned(fake_bucket):
    from app.types import Pin

    boards_service.create_board("Shareme")
    pin = Pin(
        pin_id="cov",
        board_slug="shareme",
        prompt="x",
        provider="openai",
        model="gpt-image-1",
        created_at=datetime.now(UTC).isoformat(),
        sha256="h",
        width=1024,
        height=1024,
        media_type="image/png",
        image_key="boards/shareme/cov.png",
    )
    boards_service.save_pin("shareme", pin)
    resp = boards_service.share_board("shareme")
    assert resp.mode == "presigned"
    assert resp.expires_in is not None
    assert resp.share_url.startswith("https://signed/")


def test_share_board_public(fake_bucket, monkeypatch):
    from app.types import Pin

    monkeypatch.setattr(
        boards_service, "public_url", lambda key: f"https://cdn.example.com/{key}"
    )
    boards_service.create_board("Pubshare")
    pin = Pin(
        pin_id="c2",
        board_slug="pubshare",
        prompt="x",
        provider="openai",
        model="gpt-image-1",
        created_at=datetime.now(UTC).isoformat(),
        sha256="h",
        width=1024,
        height=1024,
        media_type="image/png",
        image_key="boards/pubshare/c2.png",
    )
    boards_service.save_pin("pubshare", pin)
    resp = boards_service.share_board("pubshare")
    assert resp.mode == "public"
    assert resp.expires_in is None


def test_delete_board_scoped(fake_bucket):
    boards_service.create_board("Trash")
    assert boards_service.delete_board("trash") == 1
    with pytest.raises(boards_service.BoardError):
        boards_service.get_board("trash")


def test_delete_prefix_refuses_empty():
    from app.repo import delete_prefix

    with pytest.raises(ValueError):
        delete_prefix("")
