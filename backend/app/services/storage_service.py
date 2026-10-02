import os
import re
import shutil
import uuid
from fastapi import UploadFile
from app.core.config import settings

SAFE_FILENAME_PATTERN = re.compile(r'[^\w\s\-\.]')

def sanitize_filename(filename: str) -> str:
    """
    Strips path traversal sequences, null bytes, and special characters.
    Keeps only the base name, removes all parent directory references.
    """
    # Strip null bytes and whitespace
    filename = filename.replace('\x00', '').strip()
    # Take only the final component - blocks all path traversal
    basename = os.path.basename(filename)
    # Replace anything not alphanumeric, dash, dot, underscore, or space
    safe = SAFE_FILENAME_PATTERN.sub('_', basename)
    # Limit length
    safe = safe[:128] if len(safe) > 128 else safe
    return safe or "unnamed_document"


class StorageService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        try:
            os.makedirs(self.upload_dir, exist_ok=True)
        except Exception:
            pass

    async def save_upload_file(self, file: UploadFile, user_id: str) -> tuple[str, str]:
        """
        Saves uploaded file under user-specific folder.
        Sanitizes filename to prevent path traversal.
        Returns: (file_path, safe_original_filename)
        """
        # Sanitize the user_id to avoid directory traversal
        safe_user_id = re.sub(r'[^\w]', '', str(user_id))
        user_dir = os.path.join(self.upload_dir, safe_user_id)
        os.makedirs(user_dir, exist_ok=True)

        original_filename = sanitize_filename(file.filename or "upload")
        file_ext = os.path.splitext(original_filename)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        destination = os.path.join(user_dir, unique_filename)

        with open(destination, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return destination, original_filename

    def delete_file(self, file_path: str):
        # Ensure we only delete files within the upload directory
        try:
            abs_path = os.path.abspath(file_path)
            abs_upload_dir = os.path.abspath(self.upload_dir)
            if abs_path.startswith(abs_upload_dir) and os.path.exists(abs_path):
                os.remove(abs_path)
        except Exception:
            pass


storage_service = StorageService()
