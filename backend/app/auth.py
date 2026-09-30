"""Access control hook.

The spec has no authentication: anyone with the URL can read and write.
`require_access` is attached to every router so access control can be added
later in one place (read-only access is to be reconsidered at deployment).
"""


def require_access() -> None:
    """Allow every request."""
