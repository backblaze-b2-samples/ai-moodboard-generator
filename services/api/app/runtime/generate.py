import logging

from fastapi import APIRouter, HTTPException

from app.service.boards import BoardError
from app.service.generate import GenerateError, generate_and_pin
from app.types import GenerateRequest, GenerateResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate_endpoint(req: GenerateRequest):
    try:
        return generate_and_pin(
            prompt=req.prompt,
            board_slug=req.board_slug,
            new_board_title=req.new_board_title,
            parent_pin_id=req.parent_pin_id,
        )
    except BoardError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from None
    except GenerateError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from None
