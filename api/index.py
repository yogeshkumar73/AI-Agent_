import os
import sys
import traceback

# ── Path Bootstrap ──────────────────────────────────────────────────
# Vercel serves this file from /var/task/api/index.py or project_root/api/index.py
current_dir = os.path.dirname(os.path.abspath(__file__))    # api/
root_dir    = os.path.dirname(current_dir)                  # project root
backend_dir = os.path.join(root_dir, "backend")

# Try multiple candidate paths to locate backend and app
candidate_paths = [
    backend_dir,
    root_dir,
    os.path.join(current_dir, "backend"),
    os.path.join(os.getcwd(), "backend"),
    os.getcwd(),
]

for p in candidate_paths:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

# ── ASGI Application ────────────────────────────────────────────────
try:
    from app.main import app as fastapi_app  # FastAPI ASGI app
except Exception as e:
    err_trace = traceback.format_exc()
    print(f"CRITICAL: Failed to import FastAPI app: {err_trace}", flush=True)

    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    fastapi_app = FastAPI(title="DocuMind - Startup Diagnostics")

    @fastapi_app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def startup_diagnostics(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend function startup failed",
                "detail": str(e),
                "sys_path": sys.path[:5],
                "files_in_root": os.listdir(root_dir) if os.path.exists(root_dir) else [],
                "traceback": err_trace
            }
        )


# ── Vercel Path Fixer ASGI Wrapper ─────────────────────────────────
# Vercel CLI 62+ passes the rewritten destination path (/api/index.py).
# This wrapper restores scope["path"] from x-matched-path or x-forwarded-uri so
# FastAPI correctly routes requests to /api/v1/...
class VercelPathFixer:
    def __init__(self, inner_app):
        self.inner_app = inner_app

    async def __call__(self, scope, receive, send):
        if scope.get("type") in ("http", "websocket"):
            current_path = scope.get("path", "")
            # If the path arrived as the rewritten destination (/api/index.py)
            if current_path in ("/api/index.py", "/api/index", "/api/index.py/"):
                headers = dict(scope.get("headers", []))
                raw_path = (
                    headers.get(b"x-matched-path")
                    or headers.get(b"x-forwarded-uri")
                    or headers.get(b"x-original-url")
                    or headers.get(b"x-rewrite-url")
                )
                if raw_path:
                    clean_path = raw_path.decode("utf-8").split("?")[0]
                    scope["path"] = clean_path
                    scope["raw_path"] = clean_path.encode("latin-1")

        await self.inner_app(scope, receive, send)


app = VercelPathFixer(fastapi_app)
