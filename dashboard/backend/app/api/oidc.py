from fastapi import APIRouter
from app.models.schemas import JWKSResponse, OIDCDiscoveryDoc
from app.services.oidc_service import oidc_service
from app.core.metrics import oidc_requests_counter

router = APIRouter(prefix="/api/oidc", tags=["OIDC Discovery"])


@router.get("/discovery", response_model=OIDCDiscoveryDoc)
async def get_oidc_discovery() -> OIDCDiscoveryDoc:
    """Fetch OpenID Connect Discovery document from SPIRE OIDC provider."""
    oidc_requests_counter.labels(endpoint="discovery").inc()
    return await oidc_service.get_discovery_doc()


@router.get("/keys", response_model=JWKSResponse)
async def get_jwks() -> JWKSResponse:
    """Fetch published JSON Web Key Set (JWKS) for federated token validation."""
    oidc_requests_counter.labels(endpoint="keys").inc()
    return await oidc_service.get_jwks()
