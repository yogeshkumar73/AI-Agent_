import os
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse
from bson import ObjectId

from app.api.deps import get_current_user
from app.models.user import UserResponse
from app.models.document import DocumentResponse, DocumentStats
from app.services.document_service import document_service
from app.services.storage_service import storage_service
from app.core.database import get_documents_collection
from app.core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Upload a PDF or DOCX document and trigger analysis.
    Works seamlessly in both long-running servers and Vercel serverless functions.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Only {', '.join(ALLOWED_EXTENSIONS)} files are allowed."
        )

    # Save to user storage
    file_path, original_filename = await storage_service.save_upload_file(file, current_user.id)
    file_size = os.path.getsize(file_path)

    if file_size > MAX_FILE_SIZE:
        storage_service.delete_file(file_path)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds maximum 25MB limit.")

    mime_type = file.content_type or "application/octet-stream"

    # Create document record
    doc = await document_service.create_document(
        user_id=current_user.id,
        file_name=original_filename,
        file_size=file_size,
        mime_type=mime_type,
        storage_path=file_path
    )

    # Serverless vs Background execution
    if settings.IS_SERVERLESS:
        # On Vercel, complete analysis synchronously so serverless runtime doesn't freeze task
        await document_service.process_document_background(
            doc_id=doc.id,
            user_id=current_user.id,
            file_path=file_path,
            mime_type=mime_type
        )
        return await document_service.get_document(doc.id, current_user.id)
    else:
        background_tasks.add_task(
            document_service.process_document_background,
            doc_id=doc.id,
            user_id=current_user.id,
            file_path=file_path,
            mime_type=mime_type
        )
        return doc

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    q: Optional[str] = None,
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """List all documents belonging to current user."""
    return await document_service.list_documents(
        user_id=current_user.id,
        query=q,
        status_filter=status,
        doc_type_filter=doc_type
    )

@router.get("/stats", response_model=DocumentStats)
async def get_document_stats(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve document count, processing stats, and total extracted spend."""
    return await document_service.get_user_stats(current_user.id)

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Get single document details and extracted metadata."""
    if not ObjectId.is_valid(doc_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID format.")
    return await document_service.get_document(doc_id=doc_id, user_id=current_user.id)

@router.get("/{doc_id}/download")
async def download_document(doc_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Serve the original document for preview or download."""
    if not ObjectId.is_valid(doc_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID format.")
        
    docs = get_documents_collection()
    doc = await docs.find_one({"_id": ObjectId(doc_id), "user_id": ObjectId(current_user.id)})
    if not doc or not doc.get("storage_path") or not os.path.exists(doc["storage_path"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    
    return FileResponse(
        path=doc["storage_path"],
        filename=doc["file_name"],
        media_type=doc.get("mime_type", "application/octet-stream")
    )

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Permanently delete a document, chunks, and related insights."""
    if not ObjectId.is_valid(doc_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID format.")
    await document_service.delete_document(doc_id=doc_id, user_id=current_user.id)
    return {"message": "Document deleted successfully."}
