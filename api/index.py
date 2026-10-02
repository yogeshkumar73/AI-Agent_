import os
import sys

# ── Path Bootstrap ──────────────────────────────────────────────────
# Vercel serves this file from project_root/api/index.py
# We must add the backend folder to sys.path so `app` is importable.
current_dir = os.path.dirname(os.path.abspath(__file__))    # api/
root_dir    = os.path.dirname(current_dir)                  # project root
backend_dir = os.path.join(root_dir, "backend")

for path in [backend_dir, root_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

# ── ASGI Application ────────────────────────────────────────────────
from app.main import app  # FastAPI ASGI app

# Vercel picks up the ASGI callable named `app` automatically.
