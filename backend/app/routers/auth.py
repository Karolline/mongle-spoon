from fastapi import APIRouter, Depends, Response, status

from app.auth import WRITE_ERRORS, require_access, require_write

router = APIRouter(prefix="/auth", tags=["auth"], dependencies=[Depends(require_access)])


@router.post(
    "/verify",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses=WRITE_ERRORS,
    dependencies=[Depends(require_write)],
    operation_id="verifyPassword",
)
def verify_password() -> Response:
    """Lets the frontend check a password before remembering it."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)
