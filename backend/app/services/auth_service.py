from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status
from app.core.database import get_users_collection
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import UserCreate, UserLogin, UserResponse, Token

class AuthService:
    @staticmethod
    def _doc_to_user_response(user_doc: dict) -> UserResponse:
        return UserResponse(
            id=str(user_doc["_id"]),
            email=user_doc["email"],
            full_name=user_doc.get("full_name", ""),
            company_name=user_doc.get("company_name"),
            role=user_doc.get("role", "client"),
            is_active=user_doc.get("is_active", True),
            created_at=user_doc.get("created_at", datetime.now(timezone.utc))
        )

    @classmethod
    async def register(cls, user_in: UserCreate) -> Token:
        users = get_users_collection()
        normalized_email = user_in.email.lower().strip()
        
        existing = await users.find_one({"email": normalized_email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )
            
        now = datetime.now(timezone.utc)
        user_record = {
            "email": normalized_email,
            "password_hash": get_password_hash(user_in.password),
            "full_name": user_in.full_name.strip(),
            "company_name": user_in.company_name.strip() if user_in.company_name else None,
            "role": user_in.role or "client",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        
        result = await users.insert_one(user_record)
        user_record["_id"] = result.inserted_id
        
        access_token = create_access_token(subject=str(result.inserted_id))
        user_resp = cls._doc_to_user_response(user_record)
        
        return Token(access_token=access_token, token_type="bearer", user=user_resp)

    @classmethod
    async def login(cls, login_data: UserLogin) -> Token:
        users = get_users_collection()
        normalized_email = login_data.email.lower().strip()
        
        user_doc = await users.find_one({"email": normalized_email})
        if not user_doc or not verify_password(login_data.password, user_doc.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )
            
        if not user_doc.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive."
            )
            
        access_token = create_access_token(subject=str(user_doc["_id"]))
        user_resp = cls._doc_to_user_response(user_doc)
        
        return Token(access_token=access_token, token_type="bearer", user=user_resp)

    @classmethod
    async def get_user_by_id(cls, user_id: str) -> UserResponse:
        users = get_users_collection()
        try:
            obj_id = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")
            
        user_doc = await users.find_one({"_id": obj_id})
        if not user_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
            
        return cls._doc_to_user_response(user_doc)

auth_service = AuthService()
