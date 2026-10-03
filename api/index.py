import os
import sys
import traceback

# ── Path Bootstrap ──────────────────────────────────────────────────
# On Vercel, this file lives at /var/task/api/index.py
# The backend/ folder is bundled via includeFiles → also at /var/task/backend/
current_dir = os.path.dirname(os.path.abspath(__file__))   # /var/task/api
root_dir    = os.path.dirname(current_dir)                 # /var/task
backend_dir = os.path.join(root_dir, "backend")

for p in [backend_dir, root_dir]:
    if os.path.isdir(p) and p not in sys.path:
        sys.path.insert(0, p)

# ── ASGI Application ────────────────────────────────────────────────
try:
    from app.main import app as fastapi_app
except Exception as e:
    err_trace = traceback.format_exc()
    print(f"CRITICAL: Failed to import app — {err_trace}", flush=True)

    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    fastapi_app = FastAPI(title="DocuMind – Startup Error")

    @fastapi_app.api_route(
        "/{full_path:path}",
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    )
    async def startup_error(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend startup failed",
                "detail": str(e),
                "sys_path": sys.path[:6],
                "root_dir_contents": (
                    os.listdir(root_dir) if os.path.isdir(root_dir) else []
                ),
                "backend_dir_contents": (
                    os.listdir(backend_dir) if os.path.isdir(backend_dir) else []
                ),
                "traceback": err_trace,
            },
        )


# ── Vercel Path Restorer ─────────────────────────────────────────────
# Vercel CLI 62+ may pass the rewritten path (/api/index.py) as scope["path"].
# We restore the original path from x-matched-path / x-forwarded-uri so that
# FastAPI routes the request correctly to /api/v1/...
class VercelPathRestorer:
    """Thin ASGI middleware that fixes scope['path'] after Vercel rewrites."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope.get("type") in ("http", "websocket"):
            scope_path = scope.get("path", "")
            # Only intervene when Vercel passed the rewritten destination as path
            if scope_path.rstrip("/") in ("/api/index.py", "/api/index"):
                raw_headers = dict(scope.get("headers", []))
                original = (
                    raw_headers.get(b"x-matched-path")
                    or raw_headers.get(b"x-forwarded-uri")
                    or raw_headers.get(b"x-original-url")
                    or raw_headers.get(b"x-rewrite-url")
                )
                if original:
                    path = original.decode("utf-8").split("?")[0]
                    scope = dict(scope)         # make a mutable copy
                    scope["path"] = path
                    scope["raw_path"] = path.encode("latin-1")

        await self.inner(scope, receive, send)


# Vercel looks for a top-level callable named `app`
app = VercelPathRestorer(fastapi_app)
