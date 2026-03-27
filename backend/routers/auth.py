from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class UserProfile(BaseModel):
    id: str
    email: str
    role: str
    full_name: str


@router.get("/me")
async def get_me():
    """Placeholder — auth is handled by Supabase on the frontend."""
    raise HTTPException(status_code=501, detail="Use Supabase Auth directly from the frontend.")
