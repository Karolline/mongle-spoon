"""Dev server that refuses to start when its port is already taken.

uvicorn binds with SO_REUSEADDR, which on Windows lets a second server bind a
port that another one is still listening on. Requests then go to whichever
server Windows picks, e.g. a leftover one running old code. So check first.

Usage (inside backend/): uv run python -m app.devserver
"""

import socket
import sys

import uvicorn

HOST = "127.0.0.1"
PORT = 8000


def port_in_use(host: str, port: int) -> bool:
    """True when something is already accepting connections on host:port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(1)
        return sock.connect_ex((host, port)) == 0


def main() -> None:
    if port_in_use(HOST, PORT):
        sys.exit(
            f"Port {PORT} is already in use, probably by another backend server.\n"
            f"Stop it first. On Windows, find it with: netstat -ano | findstr :{PORT}\n"
            "then stop it with: Stop-Process -Id <PID> -Force"
        )
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)


if __name__ == "__main__":
    main()
