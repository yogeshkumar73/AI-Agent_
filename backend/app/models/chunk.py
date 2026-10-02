from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DocumentChunk(BaseModel):
    id: Optional[str] = None
    user_id: str
    document_id: str
    chunk_index: int
    page_number: int = 1
    text_content: str
    token_count: int = 0
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
