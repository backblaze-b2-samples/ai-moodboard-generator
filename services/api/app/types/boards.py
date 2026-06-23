from pydantic import BaseModel, Field


class Board(BaseModel):
    """A moodboard: a named collection of pins. Persisted as
    `boards/<slug>/board.json` — there is no database."""

    slug: str
    title: str
    description: str = ""
    created_at: str
    cover_pin_id: str | None = None
    pin_count: int = 0


class Pin(BaseModel):
    """A single generated image plus its provenance sidecar. The image lives
    at `boards/<slug>/<pin_id>.png`; this metadata at `<pin_id>.json`."""

    pin_id: str
    board_slug: str
    prompt: str
    provider: str
    model: str
    parent_pin_id: str | None = None
    created_at: str
    sha256: str
    width: int
    height: int
    media_type: str
    # Object key of the image in B2.
    image_key: str
    # Render URL the frontend should use: durable public URL when
    # B2_PUBLIC_URL_BASE is set, otherwise a presigned GET URL.
    url: str | None = None
    # Genblaze canonical provenance manifest + its hash.
    manifest: dict | None = None
    canonical_hash: str | None = None


class CreateBoardRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)


class ShareResponse(BaseModel):
    """A shareable link for a board's cover (presigned) or its public URL."""

    slug: str
    share_url: str
    # "public" when served from B2_PUBLIC_URL_BASE, else "presigned".
    mode: str
    # Seconds until a presigned link expires; None for durable public URLs.
    expires_in: int | None = None
