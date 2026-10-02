from fastapi import APIRouter, Depends, status
from app.models.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import auth_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    """Register a new user account."""
    return await auth_service.register(user_in)

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """Authenticate and obtain JWT access token."""
    return await auth_service.login(login_data)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return current_user
