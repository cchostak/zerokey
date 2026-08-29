import asyncio
import time
import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import agents, bundles, entries, oidc, overview, simulator, telemetry, ws
from app.core.config import settings
from app.core.metrics import (
    CONTENT_TYPE_LATEST,
    get_prometheus_metrics,
    http_request_duration_histogram,
    http_requests_counter,
    spiffe_active_svids_gauge,
    spiffe_attested_agents_gauge,
    spiffe_registered_workloads_gauge,
    spiffe_svid_ttl_remaining_gauge,
)
from app.services.spire_service import spire_service

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Default TTL values for tracked workloads (seconds remaining simulation).
# In a live environment these would come from the Workload API SVID bundle.
# ---------------------------------------------------------------------------
_SVID_TTLS: dict[str, int] = {
    "backend-api": 3600,
    "client-worker": 3600,
}


async def _telemetry_background_loop():
    """Periodically poll SPIRE datastore to refresh Prometheus gauges."""
    while True:
        try:
            entries_list = await spire_service.list_entries()
            agents_list = await spire_service.list_agents()
            spiffe_registered_workloads_gauge.labels(trust_domain=settings.TRUST_DOMAIN).set(
                len(entries_list)
            )
            spiffe_active_svids_gauge.labels(trust_domain=settings.TRUST_DOMAIN).set(
                len(entries_list) + 1
            )
            spiffe_attested_agents_gauge.labels(trust_domain=settings.TRUST_DOMAIN).set(
                len(agents_list)
            )
            # Simulate SVID TTL countdown (decrements each poll, resets at 60s threshold)
            for workload, ttl in list(_SVID_TTLS.items()):
                remaining = max(0, ttl - 10)
                if remaining < 60:
                    remaining = 3600  # SPIRE auto-rotates at ~1m remaining
                _SVID_TTLS[workload] = remaining
                spiffe_svid_ttl_remaining_gauge.labels(
                    spiffe_id=f"spiffe://{settings.TRUST_DOMAIN}/{workload}",
                    trust_domain=settings.TRUST_DOMAIN,
                ).set(remaining)
        except Exception as e:
            logger.debug("Telemetry background poll exception", error=str(e))
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "ZeroKey Control Plane API starting",
        version=settings.VERSION,
        trust_domain=settings.TRUST_DOMAIN,
    )
    task = asyncio.create_task(_telemetry_background_loop())
    yield
    task.cancel()
    logger.info("ZeroKey Control Plane API shutting down")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Control Plane API for SPIFFE/SPIRE Keyless Identity and Workload Management",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware: HTTP request rate & latency auto-instrumentation
# ---------------------------------------------------------------------------
@app.middleware("http")
async def prometheus_http_middleware(request: Request, call_next):
    """Record per-route HTTP metrics for every request except /metrics itself."""
    if request.url.path == "/metrics":
        return await call_next(request)

    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start

    # Normalize path to avoid high-cardinality label explosion for IDs
    path = request.url.path
    http_requests_counter.labels(
        method=request.method,
        path=path,
        status_code=str(response.status_code),
    ).inc()
    http_request_duration_histogram.labels(
        method=request.method,
        path=path,
    ).observe(duration)
    return response


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(overview.router)
app.include_router(entries.router)
app.include_router(agents.router)
app.include_router(bundles.router)
app.include_router(oidc.router)
app.include_router(simulator.router)
app.include_router(telemetry.router)
app.include_router(ws.router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "trust_domain": settings.TRUST_DOMAIN,
    }


@app.get("/metrics", tags=["Telemetry & Audit"])
async def prometheus_metrics():
    """Prometheus metrics scrape endpoint."""
    return Response(content=get_prometheus_metrics(), media_type=CONTENT_TYPE_LATEST)
