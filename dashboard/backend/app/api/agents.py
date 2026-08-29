from typing import List
from fastapi import APIRouter, HTTPException, status

from app.models.schemas import GenerateTokenRequest, GenerateTokenResponse, NodeAgent
from app.services.spire_service import spire_service

router = APIRouter(prefix="/api/agents", tags=["Node Agents"])


@router.get("", response_model=List[NodeAgent])
async def list_agents() -> List[NodeAgent]:
    """List attested SPIRE node agents."""
    return await spire_service.list_agents()


@router.post("/token", response_model=GenerateTokenResponse, status_code=status.HTTP_201_CREATED)
async def generate_join_token(req: GenerateTokenRequest) -> GenerateTokenResponse:
    """Mint a one-time join token for attesting a new SPIRE agent node."""
    if not req.spiffe_id.startswith("spiffe://"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Agent SPIFFE ID must start with 'spiffe://'",
        )
    return await spire_service.generate_join_token(req)
