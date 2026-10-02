from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class Citation(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    snippet: str

class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

class MessageCreate(BaseModel):
    content: str
    document_id: Optional[str] = None  # None for multi-document / portfolio search

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    role: str  # user | assistant | system
    content: str
    citations: List[Citation] = []
    token_usage: TokenUsage = Field(default_factory=TokenUsage)
    suggested_followups: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    document_id: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    document_id: Optional[str] = None
    last_message_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
