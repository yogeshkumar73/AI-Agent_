from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, db
from app.api.v1.router import api_v1_router
import time
from collections import defaultdict
import asyncio

# ──────────────────────────────────────────
# In-memory rate limiter with local dev bypass
# ──────────────────────────────────────────
_rate_limit_store: dict = defaultdict(list)
LOCAL_IPS = {"127.0.0.1", "::1", "localhost", "testclient", "test"}

def is_rate_limited(client_ip: str) -> bool:
    if not settings.RATE_LIMIT_ENABLED or settings.RATE_LIMIT_REQUESTS <= 0:
        return False

    # Do not rate limit local development / loopback calls
    if client_ip in LOCAL_IPS:
        return False

    now = time.time()
    window_start = now - settings.RATE_LIMIT_WINDOW
    timestamps = _rate_limit_store[client_ip]

    # Prune old entries outside sliding window
    timestamps[:] = [t for t in timestamps if t > window_start]

    if len(timestamps) >= settings.RATE_LIMIT_REQUESTS:
        return True

    timestamps.append(now)
    return False


# ──────────────────────────────────────────
# Lifespan
# ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-tenant AI-Powered Document Assistant — Production Build",
    version="1.0.0",
    lifespan=lifespan,
    # Disable interactive docs in production if VERCEL env is detected
    docs_url=None if settings.IS_SERVERLESS else "/docs",
    redoc_url=None if settings.IS_SERVERLESS else "/redoc",
)


# ──────────────────────────────────────────
# Middleware 1: Rate Limiter
# ──────────────────────────────────────────
class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
        client_ip = client_ip.split(",")[0].strip()  # handle proxy chains

        if request.url.path.startswith("/api/") and is_rate_limited(client_ip):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down and try again shortly."},
                headers={"Retry-After": str(settings.RATE_LIMIT_WINDOW)}
            )
        return await call_next(request)


# ──────────────────────────────────────────
# Middleware 2: Security Headers + DB Init
# ──────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Serverless cold-start: ensure DB is ready
        if db.db is None:
            await connect_to_mongo()

        response = await call_next(request)
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]         = "DENY"
        response.headers["X-XSS-Protection"]        = "1; mode=block"
        response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]      = "geolocation=(), microphone=(), camera=()"
        if settings.IS_SERVERLESS:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# ──────────────────────────────────────────
# Middleware 3: Configurable CORS
# ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────
# API Routes
# ──────────────────────────────────────────
app.include_router(api_v1_router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "serverless": settings.IS_SERVERLESS,
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected" if db.db is not None else "disconnected",
        "mock_db": db.is_mock,
    }
