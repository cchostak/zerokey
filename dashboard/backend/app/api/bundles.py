from fastapi import APIRouter
from app.models.schemas import TrustBundle
from app.services.spire_service import spire_service

router = APIRouter(prefix="/api/bundles", tags=["Trust Bundles"])


@router.get("", response_model=TrustBundle)
async def get_trust_bundle() -> TrustBundle:
    """Retrieve the SPIFFE Trust Domain bundle containing Root CA certificates."""
    return await spire_service.get_bundle()
