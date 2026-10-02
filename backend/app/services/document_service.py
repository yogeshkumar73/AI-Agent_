from datetime import datetime, timezone
import logging
from bson import ObjectId
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status

from app.core.database import (
    get_documents_collection, 
    get_chunks_collection, 
    get_insights_collection
)
from app.models.document import (
    DocumentResponse, 
    DocumentStatus, 
    DocumentType, 
    ExtractedMetadata, 
    DocumentStats
)
from app.services.parser_service import parser_service
from app.services.rag_service import rag_service
from app.services.ai_service import ai_service
from app.services.storage_service import storage_service

logger = logging.getLogger("uvicorn")

class DocumentService:
    @staticmethod
    def _doc_to_response(doc: dict) -> DocumentResponse:
        return DocumentResponse(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            file_name=doc["file_name"],
            file_size=doc.get("file_size", 0),
            mime_type=doc.get("mime_type", "application/octet-stream"),
            doc_type=doc.get("doc_type", DocumentType.GENERAL),
            status=doc.get("status", DocumentStatus.PENDING),
            error_message=doc.get("error_message"),
            page_count=doc.get("page_count", 0),
            summary=doc.get("summary"),
            extracted_metadata=ExtractedMetadata(**doc.get("extracted_metadata", {})),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc))
        )

    @classmethod
    async def create_document(
        cls, 
        user_id: str, 
        file_name: str, 
        file_size: int, 
        mime_type: str, 
        storage_path: str
    ) -> DocumentResponse:
        docs = get_documents_collection()
        now = datetime.now(timezone.utc)
        record = {
            "user_id": ObjectId(user_id),
            "file_name": file_name,
            "file_size": file_size,
            "mime_type": mime_type,
            "storage_path": storage_path,
            "doc_type": DocumentType.GENERAL.value,
            "status": DocumentStatus.PENDING.value,
            "error_message": None,
            "page_count": 0,
            "summary": None,
            "extracted_metadata": {},
            "created_at": now,
            "updated_at": now
        }
        res = await docs.insert_one(record)
        record["_id"] = res.inserted_id
        return cls._doc_to_response(record)

    @classmethod
    async def process_document_background(cls, doc_id: str, user_id: str, file_path: str, mime_type: str):
        docs = get_documents_collection()
        chunks_col = get_chunks_collection()
        insights_col = get_insights_collection()
        
        doc_obj_id = ObjectId(doc_id)
        user_obj_id = ObjectId(user_id)
        
        try:
            logger.info(f"Starting background processing for doc {doc_id}...")
            await docs.update_one(
                {"_id": doc_obj_id},
                {"$set": {"status": DocumentStatus.PROCESSING.value, "updated_at": datetime.now(timezone.utc)}}
            )

            # 1. Parse text per page
            pages = parser_service.parse_document(file_path, mime_type)
            full_text = "\n\n".join([p["text"] for p in pages])
            page_count = len(pages)

            # 2. Extract Document Metadata & Tier-1 Summary
            doc_record = await docs.find_one({"_id": doc_obj_id})
            file_name = doc_record.get("file_name", "Document") if doc_record else "Document"
            extracted_kpis = ai_service.extract_document_kpis(full_text, file_name)

            # 3. Chunk Document for Tier-2 Vector/Keyword RAG
            chunks = rag_service.chunk_document(pages)
            if chunks:
                chunk_docs = []
                for ch in chunks:
                    chunk_docs.append({
                        "user_id": user_obj_id,
                        "document_id": doc_obj_id,
                        "document_name": file_name,
                        "chunk_index": ch["chunk_index"],
                        "page_number": ch["page_number"],
                        "text_content": ch["text_content"],
                        "token_count": ch["token_count"],
                        "created_at": datetime.now(timezone.utc)
                    })
                await chunks_col.insert_many(chunk_docs)

            # 4. Generate AI Insights
            insights = ai_service.generate_document_insights(doc_id, file_name, extracted_kpis)
            if insights:
                insight_docs = []
                for ins in insights:
                    insight_docs.append({
                        "user_id": user_obj_id,
                        "document_id": doc_obj_id,
                        "document_name": file_name,
                        "insight_type": ins["insight_type"],
                        "title": ins["title"],
                        "description": ins["description"],
                        "confidence_score": ins["confidence_score"],
                        "actionable_query": ins["actionable_query"],
                        "created_at": datetime.now(timezone.utc)
                    })
                await insights_col.insert_many(insight_docs)

            # 5. Update Document Record to Completed
            await docs.update_one(
                {"_id": doc_obj_id},
                {"$set": {
                    "status": DocumentStatus.COMPLETED.value,
                    "doc_type": extracted_kpis["doc_type"],
                    "page_count": page_count,
                    "summary": extracted_kpis["summary"],
                    "extracted_metadata": {
                        "entity_name": extracted_kpis["entity_name"],
                        "invoice_number": extracted_kpis["invoice_number"],
                        "issue_date": extracted_kpis["issue_date"],
                        "currency": extracted_kpis["currency"],
                        "total_amount": extracted_kpis["total_amount"]
                    },
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            logger.info(f"Finished processing doc {doc_id} successfully.")
        except Exception as e:
            logger.error(f"Error processing doc {doc_id}: {str(e)}")
            await docs.update_one(
                {"_id": doc_obj_id},
                {"$set": {
                    "status": DocumentStatus.FAILED.value,
                    "error_message": str(e),
                    "updated_at": datetime.now(timezone.utc)
                }}
            )

    @classmethod
    async def list_documents(
        cls, 
        user_id: str, 
        query: Optional[str] = None, 
        status_filter: Optional[str] = None,
        doc_type_filter: Optional[str] = None
    ) -> List[DocumentResponse]:
        docs = get_documents_collection()
        user_obj_id = ObjectId(user_id)
        
        filter_dict: Dict[str, Any] = {"user_id": user_obj_id}
        if status_filter:
            filter_dict["status"] = status_filter
        if doc_type_filter:
            filter_dict["doc_type"] = doc_type_filter
        if query:
            filter_dict["file_name"] = {"$regex": query, "$options": "i"}

        cursor = docs.find(filter_dict).sort("created_at", -1)
        results = await cursor.to_list(length=100)
        return [cls._doc_to_response(d) for d in results]

    @classmethod
    async def get_document(cls, doc_id: str, user_id: str) -> DocumentResponse:
        docs = get_documents_collection()
        try:
            doc_obj_id = ObjectId(doc_id)
            user_obj_id = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format.")
            
        doc = await docs.find_one({"_id": doc_obj_id, "user_id": user_obj_id})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found or access denied.")
        return cls._doc_to_response(doc)

    @classmethod
    async def delete_document(cls, doc_id: str, user_id: str) -> bool:
        docs = get_documents_collection()
        chunks_col = get_chunks_collection()
        insights_col = get_insights_collection()
        
        try:
            doc_obj_id = ObjectId(doc_id)
            user_obj_id = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format.")

        doc = await docs.find_one({"_id": doc_obj_id, "user_id": user_obj_id})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        # Remove physical file
        if doc.get("storage_path"):
            storage_service.delete_file(doc["storage_path"])

        # Clean DB
        await docs.delete_one({"_id": doc_obj_id})
        await chunks_col.delete_many({"document_id": doc_obj_id})
        await insights_col.delete_many({"document_id": doc_obj_id})

        return True

    @classmethod
    async def get_user_stats(cls, user_id: str) -> DocumentStats:
        docs = get_documents_collection()
        user_obj_id = ObjectId(user_id)
        
        cursor = docs.find({"user_id": user_obj_id})
        all_docs = await cursor.to_list(length=500)
        
        total = len(all_docs)
        completed = sum(1 for d in all_docs if d.get("status") == DocumentStatus.COMPLETED.value)
        processing = sum(1 for d in all_docs if d.get("status") in [DocumentStatus.PENDING.value, DocumentStatus.PROCESSING.value])
        
        spend = 0.0
        doc_types_counter = {}
        for d in all_docs:
            dtype = d.get("doc_type", "general")
            doc_types_counter[dtype] = doc_types_counter.get(dtype, 0) + 1
            meta = d.get("extracted_metadata", {})
            amt = meta.get("total_amount")
            if amt and isinstance(amt, (int, float)):
                spend += amt

        return DocumentStats(
            total_documents=total,
            completed_documents=completed,
            processing_documents=processing,
            total_spend_extracted=round(spend, 2),
            doc_types=doc_types_counter
        )

document_service = DocumentService()
