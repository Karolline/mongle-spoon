"""Access control.

Reading is public: anyone with the URL can list and view recipes.
Writing (create, update, delete) needs the admin password, sent as
`Authorization: Bearer <password>`. The password comes from the
ADMIN_PASSWORD environment variable. When it is unset, writes are refused,
so a deployment that forgets to set it is read-only rather than open.
"""

import hmac
import os
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(
    auto_error=False,
    scheme_name="adminPassword",
    description="The admin password (ADMIN_PASSWORD on the server).",
)

Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def admin_password_from_env() -> str | None:
    return os.environ.get("ADMIN_PASSWORD") or None


def require_access() -> None:
    """Allow every request. Attached to every router; reads need nothing more."""


def require_write(request: Request, credentials: Credentials) -> None:
    """Reject the request unless it carries the admin password."""
    expected: str | None = request.app.state.admin_password
    if expected is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Writes are disabled: ADMIN_PASSWORD is not set on the server",
        )
    given = credentials.credentials if credentials else ""
    if not hmac.compare_digest(given.encode(), expected.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong or missing password",
            headers={"WWW-Authenticate": "Bearer"},
        )


WRITE_ERRORS = {
    401: {"description": "Wrong or missing password."},
    503: {"description": "Writes are disabled because ADMIN_PASSWORD is not set."},
}
