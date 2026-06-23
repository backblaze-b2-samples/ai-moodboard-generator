"""Board / pin CRUD over plain B2 objects — there is no database.

Layout under the bucket:
    boards/<slug>/board.json     board metadata
    boards/<slug>/<pin_id>.png   the generated image
    boards/<slug>/<pin_id>.json  the pin provenance sidecar

All S3 access goes through `app.repo` (the single boto3 client).
"""

import logging
import re
import uuid
from datetime import UTC, datetime

from app.repo import (
    delete_prefix,
    get_json,
    get_presigned_url,
    list_files,
    list_prefixes,
    public_url,
    put_json,
)
from app.types import Board, Pin, ShareResponse

logger = logging.getLogger(__name__)

BOARDS_PREFIX = "boards/"
_SLUG_RE = re.compile(r"[^a-z0-9]+")
_SHARE_EXPIRY_S = 7 * 24 * 3600  # presigned share links last a week


class BoardError(Exception):
    """Invalid board/pin request (bad slug, missing board, etc.)."""

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def slugify(title: str) -> str:
    slug = _SLUG_RE.sub("-", title.strip().lower()).strip("-")
    if not slug:
        raise BoardError("Board title must contain at least one alphanumeric character")
    return slug[:60]


def _board_key(slug: str) -> str:
    return f"{BOARDS_PREFIX}{slug}/board.json"


def _board_prefix(slug: str) -> str:
    return f"{BOARDS_PREFIX}{slug}/"


def _validate_slug(slug: str) -> None:
    if not slug or "/" in slug or ".." in slug:
        raise BoardError("Invalid board slug")


def _render_url(image_key: str) -> str:
    """Durable public URL when configured, else a presigned GET URL."""
    durable = public_url(image_key)
    return durable if durable else get_presigned_url(image_key)


def create_board(title: str, description: str = "") -> Board:
    slug = slugify(title)
    existing = get_json(_board_key(slug))
    if existing:
        # Idempotent: return the existing board rather than clobbering it.
        return Board(**existing)
    board = Board(
        slug=slug,
        title=title.strip(),
        description=description.strip(),
        created_at=datetime.now(UTC).isoformat(),
        cover_pin_id=None,
        pin_count=0,
    )
    put_json(_board_key(slug), board.model_dump())
    logger.info("Board created: slug=%s", slug)
    return board


def get_board(slug: str) -> Board:
    _validate_slug(slug)
    data = get_json(_board_key(slug))
    if not data:
        raise BoardError(f"Board not found: {slug}", status_code=404)
    return Board(**data)


def list_boards() -> list[Board]:
    boards: list[Board] = []
    for prefix in list_prefixes(BOARDS_PREFIX):
        slug = prefix[len(BOARDS_PREFIX):].rstrip("/")
        data = get_json(_board_key(slug))
        if data:
            boards.append(Board(**data))
    boards.sort(key=lambda b: b.created_at, reverse=True)
    return boards


def _hydrate_pin(data: dict) -> Pin:
    pin = Pin(**data)
    pin.url = _render_url(pin.image_key)
    return pin


def list_pins(slug: str) -> list[Pin]:
    _validate_slug(slug)
    pins: list[Pin] = []
    for f in list_files(prefix=_board_prefix(slug), max_keys=1000):
        if f.key.endswith(".json") and not f.key.endswith("board.json"):
            data = get_json(f.key)
            if data:
                pins.append(_hydrate_pin(data))
    pins.sort(key=lambda p: p.created_at, reverse=True)
    return pins


def new_pin_id() -> str:
    return uuid.uuid4().hex[:16]


def save_pin(slug: str, pin: Pin) -> Pin:
    """Persist a pin sidecar and update the board's cover/pin_count.

    The image bytes themselves are written by the generate service before
    calling this. Returns the pin hydrated with a render URL.
    """
    put_json(f"{_board_prefix(slug)}{pin.pin_id}.json", pin.model_dump())
    board = get_board(slug)
    board.pin_count += 1
    if board.cover_pin_id is None:
        board.cover_pin_id = pin.pin_id
    put_json(_board_key(slug), board.model_dump())
    pin.url = _render_url(pin.image_key)
    return pin


def share_board(slug: str) -> ShareResponse:
    """Return a shareable link for the board's cover image."""
    board = get_board(slug)
    if not board.cover_pin_id:
        raise BoardError("Board has no pins to share yet")
    image_key = f"{_board_prefix(slug)}{board.cover_pin_id}.png"
    durable = public_url(image_key)
    if durable:
        return ShareResponse(slug=slug, share_url=durable, mode="public")
    presigned = get_presigned_url(image_key, expires_in=_SHARE_EXPIRY_S)
    return ShareResponse(
        slug=slug,
        share_url=presigned,
        mode="presigned",
        expires_in=_SHARE_EXPIRY_S,
    )


def delete_board(slug: str) -> int:
    """Delete a board and all its pins (prefix-scoped). Returns count deleted."""
    _validate_slug(slug)
    deleted = delete_prefix(_board_prefix(slug))
    logger.info("Board deleted: slug=%s objects=%d", slug, deleted)
    return deleted


def delete_pin(slug: str, pin_id: str) -> None:
    """Delete a single pin (image + sidecar), scoped to its board prefix,
    and decrement the board's pin_count / clear the cover if needed."""
    _validate_slug(slug)
    if not pin_id or "/" in pin_id or ".." in pin_id:
        raise BoardError("Invalid pin id")
    board = get_board(slug)
    # Scoped to boards/<slug>/<pin_id>. — only this pin's two objects.
    delete_prefix(f"{_board_prefix(slug)}{pin_id}.")
    board.pin_count = max(0, board.pin_count - 1)
    if board.cover_pin_id == pin_id:
        remaining = list_pins(slug)
        board.cover_pin_id = remaining[0].pin_id if remaining else None
    put_json(_board_key(slug), board.model_dump())
    logger.info("Pin deleted: board=%s pin=%s", slug, pin_id)


def board_stats() -> dict:
    """Aggregate moodboard metrics for the dashboard."""
    boards = list_boards()
    total_pins = sum(b.pin_count for b in boards)
    today = datetime.now(UTC).date().isoformat()
    pins_today = 0
    for f in list_files(prefix=BOARDS_PREFIX, max_keys=1000):
        if f.key.endswith(".png") and f.uploaded_at.date().isoformat() == today:
            pins_today += 1
    return {
        "boards": len(boards),
        "pins": total_pins,
        "pins_today": pins_today,
    }
