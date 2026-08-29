from fastapi import APIRouter
from app.core.config import settings
from app.models.schemas import OverviewSummary
from app.services.oidc_service import oidc_service
from app.services.spire_service import spire_service

router = APIRouter(prefix="/api/overview", tags=["Overview"])


@router.get("", response_model=OverviewSummary)
async def get_overview() -> OverviewSummary:
    """Retrieve system-wide SPIFFE/SPIRE health, counts, and active SVID telemetry."""
    spire_healthy = await spire_service.check_health()
    entries = await spire_service.list_entries()
    agents = await spire_service.list_agents()
    oidc_healthy = await oidc_service.check_health()

    return OverviewSummary(
        trust_domain=settings.TRUST_DOMAIN,
        spire_server_healthy=spire_healthy,
        spire_agent_count=len(agents),
        workload_entries_count=len(entries),
        oidc_healthy=oidc_healthy,
        backend_api_healthy=True,
        active_svids=len(entries) + len(agents),
        system_version=settings.VERSION,
    )
