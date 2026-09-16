from fastapi import APIRouter, HTTPException

from app.cache import find_package
from app.ml import explainability
from app.models.schemas import Dependency, ExplanationResponse

router = APIRouter(prefix="/api")


# Registration order matters here: {package_id:path} is greedy and would
# swallow "/explanation" too if it were registered first, since Starlette
# matches routes in registration order and a `path` converter matches
# slashes. The more specific route must come first.
@router.get("/package/{package_id:path}/explanation", response_model=ExplanationResponse)
def get_package_explanation(package_id: str) -> ExplanationResponse:
    found = find_package(package_id)
    if not found:
        raise HTTPException(status_code=404, detail="Package not found. Analyze its repository first.")
    context, dependency = found
    if dependency.risk_profile is None:
        raise HTTPException(status_code=422, detail="Risk profile not yet computed for this package.")

    features = context.feature_vectors[package_id]
    contributions = explainability.explain(features, dependency.risk_profile.label)
    return ExplanationResponse(package_id=package_id, risk_profile=dependency.risk_profile, contributions=contributions)


@router.get("/package/{package_id:path}", response_model=Dependency)
def get_package(package_id: str) -> Dependency:
    found = find_package(package_id)
    if not found:
        raise HTTPException(status_code=404, detail="Package not found. Analyze its repository first.")
    _, dependency = found
    return dependency
