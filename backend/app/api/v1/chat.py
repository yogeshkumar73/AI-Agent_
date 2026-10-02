from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.models.user import UserResponse
from app.models.chat import (
    MessageCreate, 
    MessageResponse, 
    ConversationCreate, 
    ConversationResponse, 
    Citation, 
    TokenUsage
)
from app.core.database import (
    get_conversations_collection, 
    get_messages_collection, 
    get_chunks_collection, 
    get_documents_collection
)
from app.services.rag_service import rag_service
from app.services.ai_service import ai_service

router = APIRouter(prefix="/chat", tags=["AI Chat & Agent"])

@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(conv_in: ConversationCreate, current_user: UserResponse = Depends(get_current_user)):
    """Create a new chat conversation session."""
    convs = get_conversations_collection()
    now = datetime.now(timezone.utc)
    
    doc_id_val = ObjectId(conv_in.document_id) if conv_in.document_id else None
    record = {
        "user_id": ObjectId(current_user.id),
        "title": conv_in.title or "New Conversation",
        "document_id": doc_id_val,
        "last_message_at": now,
        "created_at": now
    }
    res = await convs.insert_one(record)
    record["_id"] = res.inserted_id
    return ConversationResponse(
        id=str(record["_id"]),
        user_id=str(record["user_id"]),
        title=record["title"],
        document_id=str(record["document_id"]) if record["document_id"] else None,
        last_message_at=record["last_message_at"],
        created_at=record["created_at"]
    )

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(current_user: UserResponse = Depends(get_current_user)):
    """List all active conversation sessions for the current user."""
    convs = get_conversations_collection()
    cursor = convs.find({"user_id": ObjectId(current_user.id)}).sort("last_message_at", -1)
    results = await cursor.to_list(length=50)
    return [
        ConversationResponse(
            id=str(c["_id"]),
            user_id=str(c["user_id"]),
            title=c["title"],
            document_id=str(c["document_id"]) if c.get("document_id") else None,
            last_message_at=c["last_message_at"],
            created_at=c["created_at"]
        ) for c in results
    ]

@router.get("/conversations/{conv_id}/messages", response_model=List[MessageResponse])
async def get_messages(conv_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Fetch all messages for a given conversation."""
    msgs = get_messages_collection()
    cursor = msgs.find({
        "conversation_id": ObjectId(conv_id),
        "user_id": ObjectId(current_user.id)
    }).sort("created_at", 1)
    
    records = await cursor.to_list(length=200)
    return [
        MessageResponse(
            id=str(m["_id"]),
            conversation_id=str(m["conversation_id"]),
            user_id=str(m["user_id"]),
            role=m["role"],
            content=m["content"],
            citations=[Citation(**c) for c in m.get("citations", [])],
            token_usage=TokenUsage(**m.get("token_usage", {})),
            suggested_followups=m.get("suggested_followups", []),
            created_at=m["created_at"]
        ) for m in records
    ]

@router.post("/conversations/{conv_id}/messages", response_model=MessageResponse)
async def send_message(
    conv_id: str, 
    msg_in: MessageCreate, 
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Send a question to the AI Agent. Retrieves relevant document context,
    minimizes token usage, answers with citations and follow-up prompts.
    """
    convs = get_conversations_collection()
    msgs = get_messages_collection()
    chunks_col = get_chunks_collection()
    docs_col = get_documents_collection()

    user_obj_id = ObjectId(current_user.id)
    conv_obj_id = ObjectId(conv_id)

    conv = await convs.find_one({"_id": conv_obj_id, "user_id": user_obj_id})
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    # 1. Save user question
    now = datetime.now(timezone.utc)
    user_msg_record = {
        "conversation_id": conv_obj_id,
        "user_id": user_obj_id,
        "role": "user",
        "content": msg_in.content,
        "citations": [],
        "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "suggested_followups": [],
        "created_at": now
    }
    await msgs.insert_one(user_msg_record)

    # 2. Context Scoping: check if query is scoped to a specific document or entire portfolio
    target_doc_id = msg_in.document_id or (str(conv["document_id"]) if conv.get("document_id") else None)
    
    # Retrieve documents metadata (Tier 1)
    doc_filter: dict = {"user_id": user_obj_id}
    if target_doc_id:
        try:
            doc_filter["_id"] = ObjectId(target_doc_id)
        except Exception:
            pass

    user_docs_cursor = docs_col.find(doc_filter)
    user_docs = await user_docs_cursor.to_list(length=20)
    summaries = []
    for d in user_docs:
        meta = d.get("extracted_metadata", {})
        summaries.append({
            "id": str(d["_id"]),
            "file_name": d["file_name"],
            "doc_type": d.get("doc_type", "general"),
            "summary": d.get("summary", ""),
            "entity_name": meta.get("entity_name"),
            "total_amount": meta.get("total_amount"),
            "currency": meta.get("currency", "USD")
        })

    # Retrieve chunks (Tier 2)
    chunk_filter: dict = {"user_id": user_obj_id}
    if target_doc_id:
        try:
            chunk_filter["document_id"] = ObjectId(target_doc_id)
        except Exception:
            pass

    chunks_cursor = chunks_col.find(chunk_filter)
    all_candidate_chunks = await chunks_cursor.to_list(length=200)

    # RAG Retrieval - top 3-4 chunks matching query
    relevant_chunks = rag_service.retrieve_relevant_chunks(msg_in.content, all_candidate_chunks, top_k=4)

    # 3. AI Agent synthesis
    answer_text, citations_data, followups, token_stats = ai_service.answer_question(
        query=msg_in.content,
        relevant_chunks=relevant_chunks,
        document_summaries=summaries
    )

    # 4. Save Assistant response
    now_reply = datetime.now(timezone.utc)
    assistant_record = {
        "conversation_id": conv_obj_id,
        "user_id": user_obj_id,
        "role": "assistant",
        "content": answer_text,
        "citations": citations_data,
        "token_usage": token_stats,
        "suggested_followups": followups,
        "created_at": now_reply
    }
    res = await msgs.insert_one(assistant_record)
    assistant_record["_id"] = res.inserted_id

    # Update conversation title & last message time
    conv_title = conv.get("title")
    if conv_title == "New Conversation":
        new_title = msg_in.content[:32] + ("..." if len(msg_in.content) > 32 else "")
        await convs.update_one({"_id": conv_obj_id}, {"$set": {"title": new_title, "last_message_at": now_reply}})
    else:
        await convs.update_one({"_id": conv_obj_id}, {"$set": {"last_message_at": now_reply}})

    return MessageResponse(
        id=str(assistant_record["_id"]),
        conversation_id=str(conv_obj_id),
        user_id=str(user_obj_id),
        role="assistant",
        content=assistant_record["content"],
        citations=[Citation(**c) for c in citations_data],
        token_usage=TokenUsage(**token_stats),
        suggested_followups=followups,
        created_at=now_reply
    )
