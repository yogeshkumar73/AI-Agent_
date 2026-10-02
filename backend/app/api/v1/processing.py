from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.api.deps import get_current_user
from app.models.user import UserResponse
from app.core.database import get_documents_collection

router = APIRouter(prefix="/processing", tags=["Processing"])

@router.get("/status/{doc_id}")
async def get_processing_status(doc_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Check live status of document parsing and analysis."""
    docs = get_documents_collection()
    try:
        doc_obj_id = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID.")

    doc = await docs.find_one({"_id": doc_obj_id, "user_id": ObjectId(current_user.id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    return {
        "document_id": str(doc["_id"]),
        "status": doc.get("status", "pending"),
        "page_count": doc.get("page_count", 0),
        "error_message": doc.get("error_message"),
        "updated_at": doc.get("updated_at")
    }
