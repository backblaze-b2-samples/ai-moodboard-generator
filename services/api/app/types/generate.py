from pydantic import BaseModel, Field

from app.types.boards import Pin


class GenerateRequest(BaseModel):
    """Generate an image and pin it into a board.

    `board_slug` targets an existing board; when omitted, `new_board_title`
    creates one inline. `parent_pin_id` records fork/remix lineage.
    """

    prompt: str = Field(min_length=1, max_length=1000)
    board_slug: str | None = None
    new_board_title: str | None = Field(default=None, max_length=120)
    parent_pin_id: str | None = None


class GenerateResponse(BaseModel):
    """The created pin plus the board it landed in."""

    pin: Pin
    board_slug: str
