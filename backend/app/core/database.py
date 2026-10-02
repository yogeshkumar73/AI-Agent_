import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger("uvicorn")

class Database:
    client = None
    db = None
    is_mock: bool = False

db = Database()

async def connect_to_mongo():
    if db.db is not None:
        return
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    try:
        # Test connection with a short timeout
        real_client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
        # Ping the server
        await asyncio.wait_for(real_client.admin.command('ping'), timeout=2.5)
        db.client = real_client
        db.db = db.client[settings.DATABASE_NAME]
        db.is_mock = False
        logger.info(f"Successfully connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        logger.warning(f"Could not connect to live MongoDB ({e}). Falling back to seamless in-memory MongoMock.")
        try:
            from mongomock_motor import AsyncMongoMockClient
            db.client = AsyncMongoMockClient()
            db.db = db.client[settings.DATABASE_NAME]
            db.is_mock = True
            logger.info("Initialized AsyncMongoMockClient for zero-dependency operation.")
        except Exception as mock_err:
            logger.error(f"Failed to initialize mongomock: {mock_err}")
            raise mock_err

    # Ensure collection indexes
    await ensure_indexes()

async def close_mongo_connection():
    if db.client:
        db.client.close()
        db.client = None
        db.db = None
        logger.info("Closed MongoDB connection.")

async def ensure_indexes():
    if db.db is None:
        return
    try:
        # Users
        await db.db.users.create_index("email", unique=True)
        # Documents
        await db.db.documents.create_index([("user_id", 1), ("created_at", -1)])
        await db.db.documents.create_index([("user_id", 1), ("status", 1)])
        # Document Chunks
        await db.db.document_chunks.create_index([("user_id", 1), ("document_id", 1)])
        # Conversations
        await db.db.conversations.create_index([("user_id", 1), ("last_message_at", -1)])
        # Messages
        await db.db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
        # AI Insights
        await db.db.ai_insights.create_index([("user_id", 1), ("document_id", 1)])
    except Exception as idx_err:
        logger.warning(f"Index creation note: {idx_err}")

# Collection accessors
def get_users_collection():
    if db.db is None:
        raise RuntimeError("Database not initialized. Please call connect_to_mongo() first.")
    return db.db.users

def get_documents_collection():
    if db.db is None:
        raise RuntimeError("Database not initialized. Please call connect_to_mongo() first.")
    return db.db.documents

def get_chunks_collection():
    if db.db is None:
        raise RuntimeError("Database not initialized. Please call connect_to_mongo() first.")
    return db.db.document_chunks

def get_conversations_collection():
    if db.db is None:
        raise RuntimeError("Database not initialized. Please call connect_to_mongo() first.")
    return db.db.conversations

def get_messages_collection():
    if db.db is None:
        raise RuntimeError("Database not initialized. Please call connect_to_mongo() first.")
    return db.db.messages

def get_insights_collection():
    if db.db is None:
        raise RuntimeError("Database not initialized. Please call connect_to_mongo() first.")
    return db.db.ai_insights
