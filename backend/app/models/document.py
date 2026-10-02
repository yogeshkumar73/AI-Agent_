from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DocumentType(str, Enum):
    BILL = "bill"
    INVOICE = "invoice"
    REPORT = "report"
    AUDIT = "audit"
    GENERAL = "general"

class ExtractedMetadata(BaseModel):
    entity_name: Optional[str] = None
    invoice_number: Optional[str] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    currency: Optional[str] = "USD"
    total_amount: Optional[float] = None
    tax_amount: Optional[float] = None
    line_item_count: Optional[int] = 0
    key_findings: List[str] = []

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_size: int
    mime_type: str
    doc_type: DocumentType = DocumentType.GENERAL
    status: DocumentStatus = DocumentStatus.PENDING
    error_message: Optional[str] = None
    page_count: int = 0
    summary: Optional[str] = None
    extracted_metadata: ExtractedMetadata = Field(default_factory=ExtractedMetadata)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentStats(BaseModel):
    total_documents: int = 0
    completed_documents: int = 0
    processing_documents: int = 0
    total_spend_extracted: float = 0.0
    doc_types: Dict[str, int] = {}
