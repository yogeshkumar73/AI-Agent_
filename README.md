# DocuMind AI — Multi-Tenant Document & Bill Assistant

An enterprise-ready AI-powered document assistant for analyzing reports, bills, and financial statements. Supports **strict multi-tenant data isolation**, **PDF & DOCX parsing**, **MongoDB Atlas persistence**, and a **two-tier token-minimized retrieval engine** — deployable to **Vercel** in minutes.

---

## ✅ Test Results (Latest Audit)

| Suite | Tests | Result |
|---|---|---|
| End-to-End Pipeline | 7 / 7 | ✅ PASS |
| Production Security Audit | 6 / 6 | ✅ PASS |

---

## 🌟 Key Features

| Feature | Details |
|---|---|
| **Multi-Tenant Isolation** | All data scoped by `user_id` at DB, storage, and API level |
| **PDF & DOCX Parsing** | Native extraction via `pypdf` + `python-docx`, page-level citations |
| **Two-Tier Token Optimization** | Tier 1: cached KPIs (totals, dates, vendor). Tier 2: semantic chunk RAG |
| **Rate Limiting** | 60 requests / 60s per IP enforced at middleware level |
| **Secure File Uploads** | MIME + extension validation, 25MB limit, path traversal prevention |
| **JWT Security** | Bcrypt hashing, expiry, tampered signature rejection |
| **Security Headers** | `nosniff`, `DENY`, `XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` |
| **Serverless Ready** | Vercel Python 3.11 runtime with cold-start DB reuse, `/tmp` storage fallback |
| **MongoDB Atlas** | Motor async driver, auto index creation, in-memory mock fallback for dev |

---

## 🚀 Vercel Deployment (Production)

### Prerequisites
- Vercel account (free tier works)
- MongoDB Atlas free cluster (M0)
- Project pushed to GitHub/GitLab

### Step 1 — Prepare MongoDB Atlas
1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → Create Free Cluster (M0)
2. Create a database user with **read/write** access
3. Under **Network Access** → Add IP `0.0.0.0/0` (allow all, for Vercel)
4. Under **Connect** → Drivers → Copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 2 — Set Vercel Environment Variables
In the Vercel dashboard → Project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `MONGODB_URL` | `mongodb+srv://<user>:<pass>@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `DATABASE_NAME` | `doc_assistant_db` |
| `JWT_SECRET` | A 32+ character random string (run: `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `JWT_ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `AI_PROVIDER` | `auto` |

> **Never commit `.env` to git.** The `.gitignore` already covers this.

### Step 3 — Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# From the project root
cd c:\Users\Admin\Downloads\Agent2
vercel

# Follow the prompts:
# - Link or create a project
# - Set root directory: . (project root)
# - Vercel reads vercel.json automatically

# Deploy to production
vercel --prod
```

### What Vercel Does Automatically
- Runs `cd frontend && npm install && npm run build` to build the React SPA
- Serves `frontend/dist/` as static files
- Routes all `/api/*` requests to `api/index.py` (Python 3.11 serverless function)
- Static assets are cached with `max-age=31536000, immutable`

---

## 💻 Local Development

### Option A: One-Click (Windows)
- **Backend**: Double-click [`start_backend.bat`](file:///c:/Users/Admin/Downloads/Agent2/start_backend.bat)
- **Frontend**: Double-click [`start_frontend.bat`](file:///c:/Users/Admin/Downloads/Agent2/start_frontend.bat)

### Option B: Terminal

```bash
# Terminal 1 — Backend (FastAPI on port 8000)
cd backend
pip install -r requirements.txt
python run.py

# Terminal 2 — Frontend (Vite on port 5173)
cd frontend
npm install
npm run dev
```

- API + Swagger docs: `http://127.0.0.1:8000/docs`
- Web app: `http://localhost:5173`

---

## 🧪 Running Tests

```bash
cd backend

# Full end-to-end functional test
python test_pipeline.py

# Full production security audit
python test_security_audit.py
```

**Security Audit Covers:**
1. HTTP Security Headers (nosniff, DENY, XSS-Protection)
2. Multi-tenant boundary isolation (cross-user 404)
3. Malformed/injection ID handling (400/404)
4. Filename sanitization & path traversal prevention
5. Forbidden file extension blocking (.exe, .sh, .py, .php)
6. JWT integrity (expired, tampered, unauthenticated)

---

## 📁 Project Structure

```
Agent2/
├── api/
│   └── index.py                    # Vercel Python ASGI entrypoint
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py             # JWT auth dependency
│   │   │   └── v1/
│   │   │       ├── auth.py         # Login & register
│   │   │       ├── documents.py    # Upload, list, download, delete
│   │   │       ├── chat.py         # AI Agent Q&A with RAG
│   │   │       ├── insights.py     # Auto-generated findings
│   │   │       ├── processing.py   # Status tracking
│   │   │       └── router.py       # Aggregated router
│   │   ├── core/
│   │   │   ├── config.py           # Env settings + serverless detection
│   │   │   ├── database.py         # Motor/MongoDB + mock fallback
│   │   │   └── security.py         # Bcrypt + JWT
│   │   ├── models/                 # Pydantic schemas
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py
│   │   │   ├── parser_service.py   # PDF & DOCX extraction
│   │   │   ├── rag_service.py      # Chunking + retrieval
│   │   │   ├── ai_service.py       # Token-optimized analysis
│   │   │   └── storage_service.py  # Hardened file storage
│   │   └── main.py                 # FastAPI + Rate Limit + CORS + Headers
│   ├── test_pipeline.py            # End-to-end functional tests
│   ├── test_security_audit.py      # Production security audit
│   ├── requirements.txt
│   ├── .env                        # Local env vars (NOT committed)
│   └── run.py                      # Local dev launcher
├── frontend/
│   ├── src/
│   │   ├── components/             # Navbar, StatsCards, DocumentList, ChatPanel…
│   │   ├── context/AuthContext.tsx
│   │   ├── pages/                  # AuthPage, DashboardPage
│   │   ├── services/api.ts
│   │   └── types/index.ts
│   ├── package.json
│   └── vite.config.ts              # Proxy: /api → :8000
├── .env                            # Root env (NOT committed)
├── .gitignore
├── requirements.txt                # Root-level (for Vercel install)
├── vercel.json                     # Vercel build + routing + headers config
├── start_backend.bat
└── start_frontend.bat
```

---

## 🔒 Security Summary

| Control | Implementation |
|---|---|
| Authentication | JWT Bearer with 24h expiry |
| Password Storage | Native `bcrypt` with random salt |
| Tenant Isolation | All DB queries filter by `user_id` |
| File Boundary | Uploads confined to `uploads/{user_id}/` via `os.path.abspath` check |
| Filename Sanitization | Strips `..`, null bytes, special chars, limits to 128 chars |
| Extension Whitelist | Only `.pdf`, `.docx`, `.doc` accepted |
| File Size Limit | Hard 25 MB cap enforced pre-storage |
| Rate Limiting | 60 req/60s per IP (in-memory, middleware level) |
| HTTP Headers | `nosniff`, `DENY`, `XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` |
| HSTS | Enforced on Vercel/serverless (`Strict-Transport-Security`) |
| CORS | Configurable via `ALLOWED_ORIGINS` env var |

---

## ⚠️ Before Going Live Checklist

- [ ] Set a strong `JWT_SECRET` (32+ random bytes) in Vercel env vars
- [ ] Set `MONGODB_URL` to your Atlas connection string in Vercel env vars
- [ ] Set `ALLOWED_ORIGINS` to your exact Vercel domain (not `*`)
- [ ] Enable MongoDB Atlas IP whitelist for Vercel egress IPs
- [ ] Remove `passlib` from requirements if unused (native bcrypt used)
- [ ] For persistent file storage across serverless invocations, integrate AWS S3 / Cloudinary
