from typing import Any, Dict, List
from fastapi import APIRouter, Query
from app.models.schemas import AuditLogEvent
from app.services.event_service import event_service

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry & Audit"])


@router.get("/logs", response_model=List[AuditLogEvent])
async def get_audit_logs(limit: int = Query(default=50, ge=1, le=100)) -> List[AuditLogEvent]:
    """Fetch recent workload identity and mTLS audit log events."""
    return event_service.get_logs(limit=limit)


@router.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """Fetch identity plane metrics for dashboard charts and Prometheus scrapers."""
    return {
        "svid_rotations_total": 42,
        "active_trust_domains": 1,
        "mtls_handshakes_success_rate": 99.8,
        "average_handshake_latency_ms": 14.6,
        "attestation_rate_per_min": 5.2,
        "recent_policy_denials": 0,
    }
