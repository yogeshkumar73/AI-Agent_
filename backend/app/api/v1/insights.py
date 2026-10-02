from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.models.user import UserResponse
from app.models.insight import AIInsightResponse
from app.core.database import get_insights_collection

router = APIRouter(prefix="/insights", tags=["AI Insights & Suggestions"])

@router.get("", response_model=List[AIInsightResponse])
async def get_all_insights(
    document_id: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """Retrieve all automated insights and suggestions generated for the user."""
    insights_col = get_insights_collection()
    filter_dict: dict = {"user_id": ObjectId(current_user.id)}
    if document_id:
        try:
            filter_dict["document_id"] = ObjectId(document_id)
        except Exception:
            pass

    cursor = insights_col.find(filter_dict).sort("created_at", -1)
    results = await cursor.to_list(length=50)
    
    return [
        AIInsightResponse(
            id=str(r["_id"]),
            user_id=str(r["user_id"]),
            document_id=str(r["document_id"]) if r.get("document_id") else None,
            document_name=r.get("document_name"),
            insight_type=r.get("insight_type", "summary"),
            title=r["title"],
            description=r["description"],
            confidence_score=r.get("confidence_score", 0.95),
            actionable_query=r.get("actionable_query"),
            created_at=r["created_at"]
        ) for r in results
    ]
