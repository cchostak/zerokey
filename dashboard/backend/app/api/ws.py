from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.event_service import event_service
import structlog

logger = structlog.get_logger()
router = APIRouter(tags=["WebSocket Events"])


@router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    """WebSocket endpoint streaming live SPIFFE identity, attestation, and mTLS events."""
    await event_service.connect(websocket)
    try:
        # Send initial connected greeting
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to ZeroKey live identity stream",
        })
        while True:
            # Keepalive / ping reception
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        event_service.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket connection exception", error=str(e))
        event_service.disconnect(websocket)
