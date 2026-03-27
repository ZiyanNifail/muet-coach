"""
Admin router — T2.01C.
Educator approval queue: list pending, approve, reject.
"""
from fastapi import APIRouter, HTTPException
from services.supabase_client import db_get_educator_approvals, db_update_educator_approval

router = APIRouter()


@router.get("/educator-approvals")
async def list_pending_approvals():
    approvals = await db_get_educator_approvals()
    return {"approvals": approvals}


@router.post("/educator-approvals/{approval_id}/approve")
async def approve_educator(approval_id: str):
    ok = await db_update_educator_approval(approval_id, "approved")
    if not ok:
        raise HTTPException(500, "Failed to approve — check Supabase connection")
    return {"message": "Approved", "approval_id": approval_id}


@router.post("/educator-approvals/{approval_id}/reject")
async def reject_educator(approval_id: str):
    ok = await db_update_educator_approval(approval_id, "rejected")
    if not ok:
        raise HTTPException(500, "Failed to reject — check Supabase connection")
    return {"message": "Rejected", "approval_id": approval_id}
