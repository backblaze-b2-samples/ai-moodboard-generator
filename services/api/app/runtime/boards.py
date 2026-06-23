import logging

from fastapi import APIRouter, HTTPException

from app.service.boards import (
    BoardError,
    board_stats,
    create_board,
    delete_board,
    delete_pin,
    get_board,
    list_boards,
    list_pins,
    share_board,
)
from app.types import Board, CreateBoardRequest, Pin, ShareResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def _handle(exc: BoardError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("/boards", response_model=list[Board])
async def list_boards_endpoint():
    return list_boards()


@router.post("/boards", response_model=Board, status_code=201)
async def create_board_endpoint(req: CreateBoardRequest):
    try:
        return create_board(req.title, req.description)
    except BoardError as e:
        raise _handle(e) from None


@router.get("/boards/stats")
async def board_stats_endpoint():
    return board_stats()


@router.get("/boards/{slug}", response_model=Board)
async def get_board_endpoint(slug: str):
    try:
        return get_board(slug)
    except BoardError as e:
        raise _handle(e) from None


@router.get("/boards/{slug}/pins", response_model=list[Pin])
async def list_pins_endpoint(slug: str):
    try:
        get_board(slug)  # 404 if the board doesn't exist
        return list_pins(slug)
    except BoardError as e:
        raise _handle(e) from None


@router.post("/boards/{slug}/share", response_model=ShareResponse)
async def share_board_endpoint(slug: str):
    try:
        return share_board(slug)
    except BoardError as e:
        raise _handle(e) from None


@router.delete("/boards/{slug}/pins/{pin_id}")
async def delete_pin_endpoint(slug: str, pin_id: str):
    try:
        delete_pin(slug, pin_id)
    except BoardError as e:
        raise _handle(e) from None
    except RuntimeError:
        raise HTTPException(status_code=500, detail="Failed to delete pin") from None
    return {"deleted": True, "slug": slug, "pin_id": pin_id}


@router.delete("/boards/{slug}")
async def delete_board_endpoint(slug: str):
    try:
        get_board(slug)  # 404 if missing
        deleted = delete_board(slug)
    except BoardError as e:
        raise _handle(e) from None
    except RuntimeError:
        raise HTTPException(status_code=500, detail="Failed to delete board") from None
    return {"deleted": True, "slug": slug, "objects": deleted}
