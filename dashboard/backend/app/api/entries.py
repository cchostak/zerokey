from typing import List
from fastapi import APIRouter, HTTPException, status

from app.models.schemas import CreateEntryRequest, CreateEntryResponse, WorkloadEntry
from app.services.spire_service import spire_service

router = APIRouter(prefix="/api/entries", tags=["Workload Entries"])


@router.get("", response_model=List[WorkloadEntry])
async def list_entries() -> List[WorkloadEntry]:
    """List all registered workload identity entries in the SPIRE Server datastore."""
    return await spire_service.list_entries()


@router.post("", response_model=CreateEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(req: CreateEntryRequest) -> CreateEntryResponse:
    """Create a new SPIFFE workload registration entry."""
    if not req.spiffe_id.startswith("spiffe://"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="SPIFFE ID must start with 'spiffe://'",
        )
    return await spire_service.create_entry(req)


@router.delete("/{entry_id}", status_code=status.HTTP_200_OK)
async def delete_entry(entry_id: str):
    """Delete a registered workload entry from the SPIRE datastore."""
    success = await spire_service.delete_entry(entry_id)
    return {"status": "success", "message": f"Entry {entry_id} deleted successfully"}
