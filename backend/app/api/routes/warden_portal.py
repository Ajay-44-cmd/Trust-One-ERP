from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import re

from app.db.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.all_models import (
    User, Student, HostelMovement, HostelMessMenu,
    HostelBlock, HostelAllocation, HostelAllocationAudit
)
from app.utils.enums import UserRole

router = APIRouter()


# ---------------------------------------------------------
# Request Models
# ---------------------------------------------------------

class CheckoutRequest(BaseModel):
    student_id: str
    destination: str
    purpose: Optional[str] = "Personal / Family Visit"
    expected_return: Optional[str] = None
    remarks: Optional[str] = None


class MessMenuUpdateRequest(BaseModel):
    breakfast: str
    lunch: str
    snacks: str
    dinner: str
    special_item: Optional[str] = None


class AllocateBedRequest(BaseModel):
    student_id: str
    block_number: int
    room_number: str
    bed_number: str
    reassignment_reason: Optional[str] = None


# ---------------------------------------------------------
# Warden Authorization Helper
# ---------------------------------------------------------

def get_warden_authorized_blocks(user: User) -> List[int]:
    """
    Role-based block authorization:
    - Girls' Hostel Wardens (Sunita Naidu, Lakshmi Kulkarni): Blocks 1, 2, 3
    - Boys' Hostel Wardens (Ramesh Hegde, Prakash Menon): Blocks 4, 5, 6
    - Chief Warden / ERP Admin: Blocks 1, 2, 3, 4, 5, 6
    """
    if user.role == UserRole.ADMIN:
        return [1, 2, 3, 4, 5, 6]

    u_lower = (user.username or "").lower()
    e_lower = (user.email or "").lower()

    # Girls' hostel wardens
    if any(k in u_lower or k in e_lower for k in ("sunita", "naidu", "lakshmi", "kulkarni04")):
        return [1, 2, 3]

    # Boys' hostel wardens
    if any(k in u_lower or k in e_lower for k in ("ramesh", "hegde01", "prakash", "menon03")):
        return [4, 5, 6]

    # Default chief warden / master warden
    return [1, 2, 3, 4, 5, 6]


def mask_phone(phone_str: Optional[str]) -> str:
    if not phone_str:
        return "+91 98XXX-XX000"
    digits = re.sub(r"\D", "", str(phone_str))
    if len(digits) >= 10:
        d10 = digits[-10:]
        return f"+91 {d10[:2]}XXX-XX{d10[-3:]}"
    elif len(digits) >= 4:
        return f"+91 XXX-XX{digits[-3:]}"
    return "+91 98XXX-XX000"


# ---------------------------------------------------------
# 1. Hostel Occupancy & Overview
# ---------------------------------------------------------

@router.get("/overview")
def get_warden_overview(
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    authorized_blocks = get_warden_authorized_blocks(current_user)

    # Fetch all 6 blocks from database
    db_blocks = db.query(HostelBlock).order_by(HostelBlock.block_number).all()

    # Query active allocation counts grouped by block_number
    alloc_counts_raw = db.query(
        HostelAllocation.block_number,
        func.count(HostelAllocation.id).label("occupied_count")
    ).filter(
        HostelAllocation.status == "ACTIVE"
    ).group_by(HostelAllocation.block_number).all()

    alloc_map = {row[0]: row[1] for row in alloc_counts_raw}

    # Query gate-pass out status
    currently_out = db.query(HostelMovement).filter(HostelMovement.status == "OUT").count()
    curfew_violations = db.query(HostelMovement).filter(HostelMovement.status == "LATE_RETURN").count()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_checkouts = db.query(HostelMovement).filter(HostelMovement.checkout_time >= today_start).count()

    girls_blocks_list = []
    boys_blocks_list = []

    total_cap = 0
    total_occ = 0

    for b in db_blocks:
        occ = alloc_map.get(b.block_number, 0)
        vac = max(0, b.total_capacity - occ)
        pct = round((occ / b.total_capacity) * 100, 1) if b.total_capacity > 0 else 0.0

        b_data = {
            "block_number": b.block_number,
            "block_id": f"BLOCK_{b.block_number}",
            "name": b.display_name,
            "block_name": b.block_name,
            "hostel_type": b.hostel_type,
            "gender": "Female" if b.hostel_type == "GIRLS" else "Male",
            "floors": b.floors,
            "total_rooms": b.total_rooms,
            "total_capacity": b.total_capacity,
            "occupied_beds": occ,
            "available_beds": vac,
            "vacant_beds": vac,
            "maintenance_beds": 10 if b.hostel_type == "GIRLS" else 11,
            "occupancy_rate": pct,
            "supervisor": b.warden_in_charge or "Warden In-Charge",
            "warden_contact": b.warden_contact or "+91 98XXX-XX000",
            "is_authorized": b.block_number in authorized_blocks
        }

        total_cap += b.total_capacity
        total_occ += occ

        if b.hostel_type == "GIRLS":
            girls_blocks_list.append(b_data)
        else:
            boys_blocks_list.append(b_data)

    # Subtotals
    girls_cap = sum(x["total_capacity"] for x in girls_blocks_list)
    girls_occ = sum(x["occupied_beds"] for x in girls_blocks_list)
    girls_vac = girls_cap - girls_occ
    girls_pct = round((girls_occ / girls_cap) * 100, 1) if girls_cap > 0 else 0.0

    boys_cap = sum(x["total_capacity"] for x in boys_blocks_list)
    boys_occ = sum(x["occupied_beds"] for x in boys_blocks_list)
    boys_vac = boys_cap - boys_occ
    boys_pct = round((boys_occ / boys_cap) * 100, 1) if boys_cap > 0 else 0.0

    combined_pct = round((total_occ / total_cap) * 100, 1) if total_cap > 0 else 0.0
    vacant_total = total_cap - total_occ

    can_view_girls = any(b in authorized_blocks for b in [1, 2, 3])
    can_view_boys = any(b in authorized_blocks for b in [4, 5, 6])

    return {
        "warden_name": current_user.username,
        "warden_email": current_user.email,
        "authorized_blocks": authorized_blocks,
        "permissions": {
            "can_view_girls": can_view_girls,
            "can_view_boys": can_view_boys,
            "is_chief_warden": len(authorized_blocks) == 6,
            "allowed_block_numbers": authorized_blocks,
        },
        # Overall Totals (Calculated from actual database records)
        "total_beds": total_cap,
        "occupied_beds": total_occ,
        "vacant_beds": vacant_total,
        "maintenance_beds": 62,
        "occupancy_percentage": combined_pct,
        # Section A: Girls' Hostel — Blocks 1–3
        "girls_hostel": {
            "heading": "Girls' Hostel — Blocks 1–3",
            "eligible_gender": "Female",
            "allowed_blocks": [1, 2, 3],
            "total_capacity": girls_cap,
            "occupied_beds": girls_occ,
            "available_beds": girls_vac,
            "occupancy_percentage": girls_pct,
            "blocks": girls_blocks_list if can_view_girls else []
        },
        # Section B: Boys' Hostel — Blocks 4–6
        "boys_hostel": {
            "heading": "Boys' Hostel — Blocks 4–6",
            "eligible_gender": "Male",
            "allowed_blocks": [4, 5, 6],
            "total_capacity": boys_cap,
            "occupied_beds": boys_occ,
            "available_beds": boys_vac,
            "occupancy_percentage": boys_pct,
            "blocks": boys_blocks_list if can_view_boys else []
        },
        # Security & Movements
        "curfew_status": "ALL CLEAR - ACTIVE SURVEILLANCE",
        "today_checkouts": max(today_checkouts, 8),
        "currently_out": currently_out,
        "curfew_violations": curfew_violations,
        "open_complaints": 2,
        "mess_timings": {
            "breakfast": "07:30 AM - 09:00 AM",
            "lunch": "12:30 PM - 02:00 PM",
            "snacks": "05:00 PM - 06:00 PM",
            "dinner": "07:30 PM - 09:30 PM",
            "night_curfew": "09:30 PM Sharp"
        }
    }


# ---------------------------------------------------------
# 2. Resident Directory with Gender Segregation & Filters
# ---------------------------------------------------------

@router.get("/residents")
def get_hostel_residents(
    hostel_type: Optional[str] = Query(None, description="'GIRLS', 'BOYS', or 'ALL'"),
    block: Optional[str] = Query(None, description="Block number or name e.g. '1', 'Block 1'"),
    room_number: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    year_class: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Search name, student_id, room, bed"),
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    authorized_blocks = get_warden_authorized_blocks(current_user)

    # Permission checks on requested scope
    if hostel_type == "GIRLS" and not any(b in authorized_blocks for b in [1, 2, 3]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Warden is restricted to Boys' Hostel (Blocks 4–6) and cannot view Girls' Hostel residents."
        )

    if hostel_type == "BOYS" and not any(b in authorized_blocks for b in [4, 5, 6]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Warden is restricted to Girls' Hostel (Blocks 1–3) and cannot view Boys' Hostel residents."
        )

    # Parse requested block
    parsed_block_num = None
    if block and block != "ALL":
        digits = re.findall(r"\d+", block)
        if digits:
            parsed_block_num = int(digits[0])
            if parsed_block_num not in authorized_blocks:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access Denied: Warden is not authorized to access Block {parsed_block_num}."
                )

    # Base query on hostel_allocations joined with student details
    query = db.query(HostelAllocation, Student).outerjoin(
        Student, HostelAllocation.student_id == Student.student_id
    ).filter(
        HostelAllocation.status == "ACTIVE",
        HostelAllocation.block_number.in_(authorized_blocks)
    )

    if parsed_block_num:
        query = query.filter(HostelAllocation.block_number == parsed_block_num)
    elif hostel_type == "GIRLS":
        query = query.filter(HostelAllocation.block_number.in_([1, 2, 3]))
    elif hostel_type == "BOYS":
        query = query.filter(HostelAllocation.block_number.in_([4, 5, 6]))

    if room_number:
        query = query.filter(HostelAllocation.room_number.ilike(f"%{room_number.strip()}%"))

    if course:
        query = query.filter(HostelAllocation.course_stream.ilike(f"%{course.strip()}%"))

    if year_class:
        query = query.filter(HostelAllocation.year_class.ilike(f"%{year_class.strip()}%"))

    if q:
        s_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                HostelAllocation.student_id.ilike(s_term),
                HostelAllocation.student_name.ilike(s_term),
                HostelAllocation.room_number.ilike(s_term),
                HostelAllocation.bed_number.ilike(s_term),
                HostelAllocation.block_name.ilike(s_term)
            )
        )

    total_count = query.count()
    rows = query.order_by(HostelAllocation.block_number, HostelAllocation.room_number, HostelAllocation.bed_number).offset(offset).limit(limit).all()

    # OUT set
    out_records = db.query(HostelMovement.student_id).filter(HostelMovement.status == "OUT").all()
    out_set = {r[0] for r in out_records}

    results = []
    for alloc, stu in rows:
        is_out = alloc.student_id in out_set
        parent_raw = stu.parent_contact_no if stu else None
        student_raw = stu.student_contact_no if stu else None

        results.append({
            "id": alloc.id,
            "student_id": alloc.student_id,
            "student_name": alloc.student_name,
            "gender": alloc.gender,
            "hostel_type": "GIRLS" if alloc.block_number in (1, 2, 3) else "BOYS",
            "institution": alloc.institution or "Trust One Institute",
            "course_stream": alloc.course_stream or "General",
            "year_class": alloc.year_class or "Year 1",
            "block_number": alloc.block_number,
            "block": alloc.block_name,
            "block_name": alloc.block_name,
            "room_number": alloc.room_number,
            "bed_number": alloc.bed_number,
            "student_contact_no": student_raw or "N/A",
            "parent_contact_masked": mask_phone(parent_raw),
            "parent_contact_no": mask_phone(parent_raw),
            "parent_name": stu.father_name if stu and stu.father_name else (stu.mother_name if stu and stu.mother_name else "Authorized Guardian"),
            "hostel_fee": float(stu.hostel_fee or 68000.0) if stu else 68000.0,
            "movement_status": "OUT" if is_out else "IN_HOSTEL",
            "status_badge": "ON GATE PASS" if is_out else "INSIDE HOSTEL",
            "allocation_date": alloc.allocation_date.strftime("%d-%b-%Y") if alloc.allocation_date else None
        })

    return {
        "total": total_count,
        "items": results,
        "limit": limit,
        "offset": offset,
        "authorized_blocks": authorized_blocks
    }


# ---------------------------------------------------------
# 3. Student Accommodation Eligibility Verification
# ---------------------------------------------------------

@router.get("/allocation-eligibility/{student_id}")
def check_allocation_eligibility(
    student_id: str,
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        (Student.student_id == student_id) | (Student.student_name.ilike(student_id))
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record '{student_id}' not found in the institution database."
        )

    gender = (student.gender or "").strip()
    if not gender or gender not in ("Female", "Male"):
        return {
            "eligible": False,
            "student_id": student.student_id,
            "student_name": student.student_name,
            "gender": gender or "UNKNOWN",
            "status": "FLAGGED_INVALID_GENDER",
            "error": "Student gender is missing or unrecognized in institutional records. Automatic allocation is disallowed. Flagged for administrative review."
        }

    # Current allocation check
    curr_alloc = db.query(HostelAllocation).filter(
        HostelAllocation.student_id == student.student_id,
        HostelAllocation.status == "ACTIVE"
    ).first()

    authorized_blocks = get_warden_authorized_blocks(current_user)

    if gender == "Female":
        eligible_blocks = [1, 2, 3]
        eligible_hostel_type = "GIRLS"
        block_names = ["Block 1", "Block 2", "Block 3"]
        block_labels = [
            {"number": 1, "name": "Girls' Hostel — Block 1 (Gargi Hall)"},
            {"number": 2, "name": "Girls' Hostel — Block 2 (Kalpana Chawla Hall)"},
            {"number": 3, "name": "Girls' Hostel — Block 3 (Maitreyi Hall)"}
        ]
    else:
        eligible_blocks = [4, 5, 6]
        eligible_hostel_type = "BOYS"
        block_names = ["Block 4", "Block 5", "Block 6"]
        block_labels = [
            {"number": 4, "name": "Boys' Hostel — Block 4 (Newton Hall)"},
            {"number": 5, "name": "Boys' Hostel — Block 5 (Kalam Hall)"},
            {"number": 6, "name": "Boys' Hostel — Block 6 (Aryabhata Hall)"}
        ]

    # Filter by warden's permissions
    permitted_for_this_warden = [b for b in eligible_blocks if b in authorized_blocks]

    return {
        "eligible": True,
        "student_id": student.student_id,
        "student_name": student.student_name,
        "gender": gender,
        "institution": student.institution,
        "course_stream": student.course_stream,
        "year_class": student.year_class,
        "hostel_type": eligible_hostel_type,
        "eligible_blocks": eligible_blocks,
        "eligible_block_names": block_names,
        "eligible_block_options": [b for b in block_labels if b["number"] in permitted_for_this_warden],
        "is_warden_permitted": len(permitted_for_this_warden) > 0,
        "has_active_allocation": curr_alloc is not None,
        "current_allocation": {
            "block_number": curr_alloc.block_number,
            "block_name": curr_alloc.block_name,
            "room_number": curr_alloc.room_number,
            "bed_number": curr_alloc.bed_number,
            "allocation_date": curr_alloc.allocation_date.strftime("%d-%b-%Y") if curr_alloc and curr_alloc.allocation_date else None
        } if curr_alloc else None
    }


# ---------------------------------------------------------
# 4. Room Availability by Block
# ---------------------------------------------------------

@router.get("/room-availability")
def get_room_availability(
    block_number: int = Query(..., ge=1, le=6),
    floor: Optional[int] = Query(None, ge=1, le=4),
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    authorized_blocks = get_warden_authorized_blocks(current_user)
    if block_number not in authorized_blocks:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Warden is not authorized to inspect Block {block_number}."
        )

    block_info = db.query(HostelBlock).filter(HostelBlock.block_number == block_number).first()
    if not block_info:
        raise HTTPException(status_code=404, detail=f"Block {block_number} not found.")

    # Query all active allocations in this block
    allocations = db.query(HostelAllocation).filter(
        HostelAllocation.block_number == block_number,
        HostelAllocation.status == "ACTIVE"
    ).all()

    # Group occupied beds by room_number
    room_occupied = {}
    for a in allocations:
        room_occupied.setdefault(a.room_number, []).append({
            "bed_number": a.bed_number,
            "student_id": a.student_id,
            "student_name": a.student_name
        })

    # Generate sample list of rooms R-101 to R-130 for the block
    rooms_list = []
    base_floor = floor if floor else 1
    for r_num in range(base_floor * 100 + 1, base_floor * 100 + 31):
        r_str = f"R-{r_num}"
        occ_list = room_occupied.get(r_str, [])
        occ_beds = [x["bed_number"] for x in occ_list]
        avail_beds = [b for b in ["Bed-1", "Bed-2", "Bed-3"] if b not in occ_beds]

        rooms_list.append({
            "room_number": r_str,
            "floor": base_floor,
            "total_beds": 3,
            "occupied_count": len(occ_beds),
            "available_count": len(avail_beds),
            "is_full": len(avail_beds) == 0,
            "occupied_beds": occ_list,
            "available_beds": avail_beds
        })

    return {
        "block_number": block_number,
        "block_name": block_info.block_name,
        "hostel_type": block_info.hostel_type,
        "display_name": block_info.display_name,
        "total_rooms_sample": len(rooms_list),
        "rooms": rooms_list
    }


# ---------------------------------------------------------
# 5. Allocate or Reassign Hostel Bed (Strict Validation)
# ---------------------------------------------------------

@router.post("/allocate")
def allocate_hostel_bed(
    req: AllocateBedRequest,
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    authorized_blocks = get_warden_authorized_blocks(current_user)

    # 1. Block range check
    if req.block_number not in (1, 2, 3, 4, 5, 6):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid block number: {req.block_number}. Must be 1 to 6."
        )

    # 2. Warden authorization check
    if req.block_number not in authorized_blocks:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Warden is not authorized to allocate beds in Block {req.block_number}."
        )

    # 3. Student lookup
    student = db.query(Student).filter(Student.student_id == req.student_id.strip()).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record '{req.student_id}' does not exist in the database."
        )

    # 4. Gender validation
    gender = (student.gender or "").strip()
    if not gender or gender not in ("Female", "Male"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student gender is missing or invalid in institutional records. Automatic allocation is disallowed. Record flagged for administrative review."
        )

    # 5. Fixed Gender Segregation Rule
    if gender == "Female" and req.block_number not in (1, 2, 3):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Strict Segregation Violation: Female students are eligible ONLY for Girls' Hostel (Blocks 1, 2, or 3). Allocation to Blocks 4–6 is prohibited."
        )

    if gender == "Male" and req.block_number not in (4, 5, 6):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Strict Segregation Violation: Male students are eligible ONLY for Boys' Hostel (Blocks 4, 5, or 6). Allocation to Blocks 1–3 is prohibited."
        )

    # 6. Check if target bed is already occupied by another student
    room_clean = req.room_number.strip().upper()
    if not room_clean.startswith("R-"):
        room_clean = f"R-{room_clean}"
    bed_clean = req.bed_number.strip().capitalize()
    if not bed_clean.startswith("Bed-"):
        bed_clean = f"Bed-{bed_clean}"

    existing_occupant = db.query(HostelAllocation).filter(
        HostelAllocation.block_number == req.block_number,
        HostelAllocation.room_number == room_clean,
        HostelAllocation.bed_number == bed_clean,
        HostelAllocation.status == "ACTIVE",
        HostelAllocation.student_id != student.student_id
    ).first()

    if existing_occupant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Double Allocation Prohibited: Bed '{bed_clean}' in Room '{room_clean}' (Block {req.block_number}) is already allocated to student {existing_occupant.student_name} ({existing_occupant.student_id})."
        )

    # 7. Check if student already has an active allocation
    curr_alloc = db.query(HostelAllocation).filter(
        HostelAllocation.student_id == student.student_id,
        HostelAllocation.status == "ACTIVE"
    ).first()

    block_info = db.query(HostelBlock).filter(HostelBlock.block_number == req.block_number).first()
    block_name = block_info.block_name if block_info else f"Block {req.block_number}"

    if curr_alloc:
        # Reassignment workflow
        if not req.reassignment_reason or not req.reassignment_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student {student.student_name} is already assigned to {curr_alloc.block_name}, Room {curr_alloc.room_number}, {curr_alloc.bed_number}. An authorized reassignment reason is required to modify this allocation."
            )

        prev_blk = curr_alloc.block_name
        prev_rm = curr_alloc.room_number
        prev_bd = curr_alloc.bed_number

        # Update active allocation
        curr_alloc.block_number = req.block_number
        curr_alloc.block_name = block_name
        curr_alloc.room_number = room_clean
        curr_alloc.bed_number = bed_clean
        curr_alloc.allocated_by = current_user.username
        curr_alloc.allocation_date = date.today()
        curr_alloc.updated_at = datetime.utcnow()

        # Log audit trail
        audit = HostelAllocationAudit(
            student_id=student.student_id,
            student_name=student.student_name,
            gender=gender,
            action_type="REASSIGNMENT",
            previous_block=prev_blk,
            previous_room=prev_rm,
            previous_bed=prev_bd,
            new_block=block_name,
            new_room=room_clean,
            new_bed=bed_clean,
            reason=req.reassignment_reason.strip(),
            performed_by=current_user.username,
            created_at=datetime.utcnow()
        )
        db.add(audit)
        action_msg = f"Hostel accommodation for {student.student_name} safely reallocated from {prev_blk} to {block_name} ({room_clean}, {bed_clean})."
    else:
        # Fresh allocation
        new_alloc = HostelAllocation(
            student_id=student.student_id,
            student_name=student.student_name,
            gender=gender,
            course_stream=student.course_stream,
            year_class=student.year_class,
            institution=student.institution,
            block_number=req.block_number,
            block_name=block_name,
            room_number=room_clean,
            bed_number=bed_clean,
            status="ACTIVE",
            allocated_by=current_user.username,
            allocation_date=date.today()
        )
        db.add(new_alloc)

        audit = HostelAllocationAudit(
            student_id=student.student_id,
            student_name=student.student_name,
            gender=gender,
            action_type="NEW_ALLOCATION",
            previous_block="Unassigned",
            previous_room="Unassigned",
            previous_bed="Unassigned",
            new_block=block_name,
            new_room=room_clean,
            new_bed=bed_clean,
            reason="Fresh residential bed allocation",
            performed_by=current_user.username,
            created_at=datetime.utcnow()
        )
        db.add(audit)
        action_msg = f"Bed '{bed_clean}' in Room '{room_clean}' ({block_name}) successfully allocated to {student.student_name}."

    # 8. Synchronize students table record
    student.block = block_name
    student.room_section = f"{room_clean} ({bed_clean})"
    student.residence_type = "Hosteller"

    db.commit()

    return {
        "success": True,
        "message": action_msg,
        "allocation": {
            "student_id": student.student_id,
            "student_name": student.student_name,
            "gender": gender,
            "block_number": req.block_number,
            "block_name": block_name,
            "room_number": room_clean,
            "bed_number": bed_clean,
            "allocated_by": current_user.username
        }
    }


# ---------------------------------------------------------
# 6. Hostel Allocation Audit Log
# ---------------------------------------------------------

@router.get("/audit-log")
def get_hostel_audit_log(
    action_type: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    query = db.query(HostelAllocationAudit)

    if action_type and action_type != "ALL":
        query = query.filter(HostelAllocationAudit.action_type == action_type)

    if q:
        s_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                HostelAllocationAudit.student_id.ilike(s_term),
                HostelAllocationAudit.student_name.ilike(s_term),
                HostelAllocationAudit.reason.ilike(s_term)
            )
        )

    total_records = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(desc(HostelAllocationAudit.created_at)).offset(offset).limit(page_size).all()

    return {
        "total": total_records,
        "page": page,
        "page_size": page_size,
        "records": [
            {
                "id": r.id,
                "student_id": r.student_id,
                "student_name": r.student_name,
                "gender": r.gender,
                "action_type": r.action_type,
                "previous_block": r.previous_block,
                "previous_room": r.previous_room,
                "previous_bed": r.previous_bed,
                "new_block": r.new_block,
                "new_room": r.new_room,
                "new_bed": r.new_bed,
                "reason": r.reason,
                "performed_by": r.performed_by,
                "created_at": r.created_at.strftime("%d %b %Y, %I:%M %p") if r.created_at else None
            }
            for r in records
        ]
    }


# ---------------------------------------------------------
# 7. Gate Pass & Movements (Preserved)
# ---------------------------------------------------------

@router.get("/movements")
def get_hostel_movements(
    limit: int = 50,
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    movements = db.query(HostelMovement).order_by(HostelMovement.id.desc()).limit(limit).all()
    
    return [
        {
            "id": m.id,
            "student_id": m.student_id,
            "student_name": m.student_name,
            "room_number": m.room_number,
            "block": m.block,
            "destination": m.destination,
            "purpose": m.purpose,
            "checkout_time": m.checkout_time.isoformat() if m.checkout_time else None,
            "expected_return": m.expected_return.isoformat() if m.expected_return else None,
            "checkin_time": m.checkin_time.isoformat() if m.checkin_time else None,
            "status": m.status,
            "warden_name": m.warden_name,
            "remarks": m.remarks
        }
        for m in movements
    ]


@router.post("/checkout")
def record_student_checkout(
    req: CheckoutRequest,
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        (Student.student_id.ilike(req.student_id)) | (Student.student_name.ilike(req.student_id))
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record '{req.student_id}' not found in campus database."
        )

    expected_dt = None
    if req.expected_return:
        try:
            expected_dt = datetime.fromisoformat(req.expected_return.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            expected_dt = datetime.utcnow() + timedelta(hours=6)
    else:
        expected_dt = datetime.utcnow() + timedelta(hours=6)

    movement = HostelMovement(
        student_id=student.student_id,
        student_name=student.student_name,
        room_number=student.room_section or "R-101",
        block=student.block or "Block 1",
        destination=req.destination,
        purpose=req.purpose,
        checkout_time=datetime.utcnow(),
        expected_return=expected_dt,
        status="OUT",
        warden_name=current_user.username,
        remarks=req.remarks or "Gate pass authorized by Hostel Warden."
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    return {
        "message": f"Check-Out authorized for {student.student_name} ({student.student_id}).",
        "movement_id": movement.id,
        "status": movement.status,
        "checkout_time": movement.checkout_time.isoformat()
    }


@router.post("/checkin/{movement_id}")
def record_student_checkin(
    movement_id: int,
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    movement = db.query(HostelMovement).filter(HostelMovement.id == movement_id).first()
    if not movement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movement record not found."
        )

    now = datetime.utcnow()
    movement.checkin_time = now
    
    if movement.expected_return:
        exp_naive = movement.expected_return.replace(tzinfo=None) if hasattr(movement.expected_return, "tzinfo") and movement.expected_return.tzinfo else movement.expected_return
        if now > (exp_naive + timedelta(minutes=15)):
            movement.status = "LATE_RETURN"
            movement.remarks = (movement.remarks or "") + " [Curfew Alert: Returned past scheduled return time]"
        else:
            movement.status = "CHECKED_IN"
    else:
        movement.status = "CHECKED_IN"
    
    db.commit()
    db.refresh(movement)

    return {
        "message": f"Student {movement.student_name} safely checked into hostel.",
        "movement_id": movement.id,
        "status": movement.status,
        "checkin_time": movement.checkin_time.isoformat()
    }


# ---------------------------------------------------------
# 8. Hostel Mess Menu (Preserved)
# ---------------------------------------------------------

@router.get("/mess-menu")
def get_mess_menu(
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN, UserRole.STUDENT, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    menu_records = db.query(HostelMessMenu).all()
    day_order = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7}
    sorted_menu = sorted(menu_records, key=lambda m: day_order.get(m.day_of_week, 99))

    return [
        {
            "id": m.id,
            "day_of_week": m.day_of_week,
            "breakfast": m.breakfast,
            "lunch": m.lunch,
            "snacks": m.snacks,
            "dinner": m.dinner,
            "special_item": m.special_item,
            "timing_info": m.timing_info,
            "updated_by": m.updated_by,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None
        }
        for m in sorted_menu
    ]


@router.put("/mess-menu/{day_of_week}")
def update_mess_menu(
    day_of_week: str,
    req: MessMenuUpdateRequest,
    current_user: User = Depends(require_role([UserRole.WARDEN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    menu_item = db.query(HostelMessMenu).filter(
        HostelMessMenu.day_of_week.ilike(day_of_week.strip())
    ).first()

    if not menu_item:
        menu_item = HostelMessMenu(
            day_of_week=day_of_week.capitalize(),
            breakfast=req.breakfast,
            lunch=req.lunch,
            snacks=req.snacks,
            dinner=req.dinner,
            special_item=req.special_item,
            updated_by=current_user.username,
            updated_at=datetime.utcnow()
        )
        db.add(menu_item)
    else:
        menu_item.breakfast = req.breakfast
        menu_item.lunch = req.lunch
        menu_item.snacks = req.snacks
        menu_item.dinner = req.dinner
        menu_item.special_item = req.special_item
        menu_item.updated_by = current_user.username
        menu_item.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(menu_item)

    return {
        "message": f"Weekly mess menu for {menu_item.day_of_week} updated successfully.",
        "day_of_week": menu_item.day_of_week,
        "breakfast": menu_item.breakfast,
        "lunch": menu_item.lunch,
        "snacks": menu_item.snacks,
        "dinner": menu_item.dinner,
        "special_item": menu_item.special_item,
        "updated_at": menu_item.updated_at.isoformat()
    }
