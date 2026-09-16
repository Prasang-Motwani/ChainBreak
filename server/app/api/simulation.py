from fastapi import APIRouter, HTTPException

from app.cache import find_package
from app.models.schemas import CompromiseRequest, CompromiseResponse, MitigationRequest, MitigationResponse
from app.simulation.compromise import simulate_compromise
from app.simulation.mitigation import simulate_mitigation

router = APIRouter(prefix="/api")


@router.post("/simulate/compromise", response_model=CompromiseResponse)
def simulate_compromise_endpoint(payload: CompromiseRequest) -> CompromiseResponse:
    found = find_package(payload.package_id)
    if not found:
        raise HTTPException(status_code=404, detail="Package not found. Analyze its repository first.")
    context, _ = found
    return simulate_compromise(context, payload.package_id)


@router.post("/simulate/mitigation", response_model=MitigationResponse)
def simulate_mitigation_endpoint(payload: MitigationRequest) -> MitigationResponse:
    found = find_package(payload.package_id)
    if not found:
        raise HTTPException(status_code=404, detail="Package not found. Analyze its repository first.")
    context, _ = found
    return simulate_mitigation(context, payload.package_id)
