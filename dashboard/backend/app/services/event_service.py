import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Set
from fastapi import WebSocket
import structlog

from app.models.schemas import AuditLogEvent

logger = structlog.get_logger()


class EventService:
    """Manages WebSocket subscribers and an in-memory ring buffer of audit logs."""

    def __init__(self, max_logs: int = 100):
        self._active_connections: Set[WebSocket] = set()
        self._max_logs = max_logs
        self._audit_logs: List[AuditLogEvent] = []
        self._lock = asyncio.Lock()

        # Seed initial log events
        self._seed_initial_events()

    def _seed_initial_events(self):
        now = datetime.now(timezone.utc).isoformat()
        initial_events = [
            AuditLogEvent(
                id=str(uuid.uuid4()),
                timestamp=now,
                event_type="SYSTEM_BOOT",
                actor="spire-server",
                target="demo.local",
                status="SUCCESS",
                details="SPIRE Server initialized Root Certificate Authority and SQLite datastore",
            ),
            AuditLogEvent(
                id=str(uuid.uuid4()),
                timestamp=now,
                event_type="NODE_ATTESTATION",
                actor="spire-agent",
                target="spiffe://demo.local/node/agent",
                status="SUCCESS",
                details="Node attested via join_token plugin and Docker socket inspection",
            ),
            AuditLogEvent(
                id=str(uuid.uuid4()),
                timestamp=now,
                event_type="SVID_MINT",
                actor="spire-server",
                target="spiffe://demo.local/backend-api",
                status="SUCCESS",
                details="Issued X.509 SVID (TTL: 3600s, Selector: docker:label:workload:backend-api)",
            ),
            AuditLogEvent(
                id=str(uuid.uuid4()),
                timestamp=now,
                event_type="SVID_MINT",
                actor="spire-server",
                target="spiffe://demo.local/client-worker",
                status="SUCCESS",
                details="Issued X.509 SVID (TTL: 3600s, Selector: docker:label:workload:client-worker)",
            ),
        ]
        self._audit_logs.extend(initial_events)

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._active_connections.add(websocket)
        logger.info("WebSocket client connected", total_clients=len(self._active_connections))

    def disconnect(self, websocket: WebSocket):
        self._active_connections.discard(websocket)
        logger.info("WebSocket client disconnected", total_clients=len(self._active_connections))

    async def broadcast(self, message: Dict):
        """Broadcast JSON payload to all active WebSocket clients."""
        if not self._active_connections:
            return

        dead_connections = set()
        for connection in self._active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning("Error broadcasting to websocket client", error=str(e))
                dead_connections.add(connection)

        for dead in dead_connections:
            self._active_connections.discard(dead)

    async def record_event(
        self,
        event_type: str,
        actor: str,
        target: str,
        status: str,
        details: str,
    ) -> AuditLogEvent:
        """Record an audit log event and broadcast it in real-time."""
        event = AuditLogEvent(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_type=event_type,
            actor=actor,
            target=target,
            status=status,
            details=details,
        )

        async with self._lock:
            self._audit_logs.insert(0, event)
            if len(self._audit_logs) > self._max_logs:
                self._audit_logs.pop()

        # Broadcast event to WebSocket clients
        await self.broadcast({
            "type": "AUDIT_EVENT",
            "event": event.model_dump(),
        })

        try:
            from app.core.metrics import spiffe_audit_events_counter
            spiffe_audit_events_counter.labels(event_type=event_type, status=status).inc()
        except Exception:
            pass

        return event

    def get_logs(self, limit: int = 50) -> List[AuditLogEvent]:
        return self._audit_logs[:limit]


event_service = EventService()
