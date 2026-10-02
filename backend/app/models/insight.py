from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AIInsightResponse(BaseModel):
    id: str
    user_id: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    insight_type: str  # cost_spike | summary | recommendation | question_prompt | anomaly
    title: str
    description: str
    confidence_score: float = 0.95
    actionable_query: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
