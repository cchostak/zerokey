from fastapi import APIRouter
from app.models.schemas import (
    KeylessTestFlowRequest,
    KeylessTestFlowResponse,
    PolicyEvaluationRequest,
    PolicyEvaluationResponse,
)
from app.services.flow_service import flow_service

router = APIRouter(prefix="/api/simulator", tags=["Keyless mTLS Simulator"])


@router.post("/execute", response_model=KeylessTestFlowResponse)
async def execute_test_flow(req: KeylessTestFlowRequest = KeylessTestFlowRequest()) -> KeylessTestFlowResponse:
    """Trigger a live keyless mTLS transaction test between client-worker and backend-api."""
    return await flow_service.execute_test_flow(req)


@router.post("/evaluate-policy", response_model=PolicyEvaluationResponse)
async def evaluate_policy(req: PolicyEvaluationRequest) -> PolicyEvaluationResponse:
    """Evaluate whether a candidate SPIFFE ID is authorized to access protected backend routes."""
    return flow_service.evaluate_policy(req)
