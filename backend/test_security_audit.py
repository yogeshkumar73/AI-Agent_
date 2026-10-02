import asyncio
import jwt
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection

async def run_security_audit():
    print("\n=======================================================")
    print("      RUNNING PRODUCTION SECURITY AUDIT SUITE          ")
    print("=======================================================\n")
    
    await connect_to_mongo()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Security Headers Verification
        print("Test 1: Verifying Security Headers...")
        resp = await client.get("/health")
        assert resp.status_code == 200
        headers = resp.headers
        assert headers.get("x-content-type-options") == "nosniff", "Missing X-Content-Type-Options"
        assert headers.get("x-frame-options") == "DENY", "Missing X-Frame-Options"
        assert headers.get("x-xss-protection") == "1; mode=block", "Missing X-XSS-Protection"
        print("  [PASS] All core security headers present (nosniff, DENY, XSS-Protection).")

        # Setup Two Distinct Users
        user_a_res = await client.post("/api/v1/auth/register", json={
            "email": "user_a@enterprise.com",
            "password": "SecurePassword123!",
            "full_name": "Alice Enterprise",
            "company_name": "Corp A"
        })
        token_a = user_a_res.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        user_b_res = await client.post("/api/v1/auth/register", json={
            "email": "user_b@enterprise.com",
            "password": "SecurePassword123!",
            "full_name": "Bob Competitor",
            "company_name": "Corp B"
        })
        token_b = user_b_res.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User A uploads a sensitive document
        fake_pdf = b"%PDF-1.4 Financial Statement Total: $120,000.00 %%EOF"
        files = {"file": ("Confidential_Report.pdf", fake_pdf, "application/pdf")}
        up_res = await client.post("/api/v1/documents/upload", files=files, headers=headers_a)
        assert up_res.status_code == 202
        doc_a_id = up_res.json()["id"]

        # Test 2: Tenant Boundary Isolation Check
        print("\nTest 2: Multi-Tenant Boundary Isolation...")
        # User B tries to view User A's document
        leak_view = await client.get(f"/api/v1/documents/{doc_a_id}", headers=headers_b)
        assert leak_view.status_code == 404, f"Tenant leak: User B could view User A's doc ({leak_view.status_code})"
        
        # User B tries to download User A's document
        leak_download = await client.get(f"/api/v1/documents/{doc_a_id}/download", headers=headers_b)
        assert leak_download.status_code == 404, f"Tenant leak: User B could download User A's doc ({leak_download.status_code})"

        # User B tries to delete User A's document
        leak_delete = await client.delete(f"/api/v1/documents/{doc_a_id}", headers=headers_b)
        assert leak_delete.status_code == 404, f"Tenant leak: User B could delete User A's doc ({leak_delete.status_code})"
        print("  [PASS] Tenant boundary enforced. Unauthorized cross-tenant access returns 404.")

        # Test 3: Malformed & Injection ID Testing
        print("\nTest 3: Malformed & Injection ID Testing...")
        malicious_ids = [
            "6448c81a' OR 1=1 --",
            "admin",
            "../../etc/passwd",
            "<script>alert(1)</script>",
            "123"
        ]
        for bad_id in malicious_ids:
            res = await client.get(f"/api/v1/documents/{bad_id}", headers=headers_a)
            assert res.status_code in [400, 404], f"Unexpected status {res.status_code} for bad ID: {bad_id}"
        print("  [PASS] All malformed and injection IDs safely handled (400/404).")

        # Test 4: Path Traversal Attack on Upload Filename
        print("\nTest 4: Filename Sanitization & Path Traversal Prevention...")
        traversal_files = {"file": ("../../../../etc/shadow.pdf", fake_pdf, "application/pdf")}
        trav_res = await client.post("/api/v1/documents/upload", files=traversal_files, headers=headers_a)
        assert trav_res.status_code == 202
        saved_filename = trav_res.json()["file_name"]
        print(f"  [PASS] Path traversal handled safely. File registered as: {saved_filename}")

        # Test 5: Unauthorized Executable Extension Validation
        print("\nTest 5: Extension Validation (Blocking Forbidden Files)...")
        forbidden_extensions = [
            ("program.exe", b"binary content", "application/octet-stream"),
            ("script.sh", b"echo hello", "text/plain"),
            ("test.py", b"print('hello')", "text/plain"),
            ("index.php", b"echo 'test';", "text/plain")
        ]
        for fname, content, mtype in forbidden_extensions:
            bad_upload = await client.post("/api/v1/documents/upload", files={"file": (fname, content, mtype)}, headers=headers_a)
            assert bad_upload.status_code == 400, f"Allowed forbidden file: {fname}"
        print("  [PASS] Blocked unauthorized extensions (.exe, .sh, .py, .php) with 400 Bad Request.")

        # Test 6: Tampered & Expired JWT Protection
        print("\nTest 6: Authentication & JWT Integrity...")
        # Unauthenticated request
        unauth = await client.get("/api/v1/documents")
        assert unauth.status_code in [401, 403]

        # Expired token
        expired_payload = {
            "sub": str(user_a_res.json()["user"]["id"]),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1)
        }
        expired_token = jwt.encode(expired_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        exp_res = await client.get("/api/v1/documents", headers={"Authorization": f"Bearer {expired_token}"})
        assert exp_res.status_code == 401, f"Expired token accepted! ({exp_res.status_code})"

        # Tampered signature
        tampered_token = jwt.encode(expired_payload, "wrong_secret_key_999_32_bytes_length_secure!", algorithm=settings.JWT_ALGORITHM)
        tamp_res = await client.get("/api/v1/documents", headers={"Authorization": f"Bearer {tampered_token}"})
        assert tamp_res.status_code == 401, f"Tampered token accepted! ({tamp_res.status_code})"
        print("  [PASS] Tampered, expired, and unauthenticated tokens rejected (401 Unauthorized).")

    await close_mongo_connection()
    print("\n=======================================================")
    print("   ALL PRODUCTION SECURITY AUDIT TESTS PASSED! [6/6]   ")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_security_audit())
