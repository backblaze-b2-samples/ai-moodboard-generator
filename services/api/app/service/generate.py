"""Generate-and-pin orchestration: provider call -> persist to B2 -> pin.

The provider call is delegated to `repo.generate_image` (Genblaze); this
layer never imports Genblaze or boto3 directly. It wires generation to the
board service and writes the image + provenance sidecar to B2.
"""

import logging
from datetime import UTC, datetime

from app.repo import generate_image, upload_file
from app.repo.genblaze_image import ImageGenerationError
from app.service.boards import (
    BoardError,
    create_board,
    get_board,
    new_pin_id,
    save_pin,
)
from app.types import GenerateResponse, Pin

logger = logging.getLogger(__name__)

PROVIDER = "openai"
MODEL = "gpt-image-1"


class GenerateError(Exception):
    """Raised when generation fails (provider error, missing key, etc.)."""

    def __init__(self, detail: str, status_code: int = 502):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def _resolve_board(board_slug: str | None, new_board_title: str | None) -> str:
    """Return the target board slug, creating a board inline if requested."""
    if board_slug:
        get_board(board_slug)  # raises BoardError(404) if missing
        return board_slug
    if new_board_title:
        return create_board(new_board_title).slug
    raise BoardError("Provide either board_slug or new_board_title")


def generate_and_pin(
    prompt: str,
    board_slug: str | None = None,
    new_board_title: str | None = None,
    parent_pin_id: str | None = None,
) -> GenerateResponse:
    slug = _resolve_board(board_slug, new_board_title)

    try:
        result = generate_image(prompt)
    except ImageGenerationError as e:
        logger.warning("Generation failed: %s", e)
        raise GenerateError(str(e)) from None

    pin_id = new_pin_id()
    image_key = f"boards/{slug}/{pin_id}.png"
    upload_file(result.image_bytes, image_key, result.media_type)

    pin = Pin(
        pin_id=pin_id,
        board_slug=slug,
        prompt=prompt,
        provider=PROVIDER,
        model=MODEL,
        parent_pin_id=parent_pin_id,
        created_at=datetime.now(UTC).isoformat(),
        sha256=result.sha256,
        width=result.width,
        height=result.height,
        media_type=result.media_type,
        image_key=image_key,
        manifest=result.manifest,
        canonical_hash=result.canonical_hash,
    )
    pin = save_pin(slug, pin)
    logger.info(
        "Pin created: board=%s pin=%s sha256=%s parent=%s",
        slug,
        pin_id,
        result.sha256[:12],
        parent_pin_id or "-",
    )
    return GenerateResponse(pin=pin, board_slug=slug)
