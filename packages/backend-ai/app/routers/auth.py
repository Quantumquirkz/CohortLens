from fastapi import APIRouter

from app.deps.auth_wallet import issue_nonce

router = APIRouter()


@router.get("/nonce")
async def get_nonce() -> dict[str, str]:
    return {"nonce": issue_nonce()}
