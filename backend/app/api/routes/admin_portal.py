import os
import csv
import io
import json
import uuid
import random
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

from app.db.database import get_db
from app.core.dependencies import require_role, get_current_user
from app.models.all_models import (
    User, Student, Faculty, Fee, NocApplication, Notice, PlacementDrive,
    AdminProfile, AdmissionApplication, AdmissionDocument, AdminNotification,
    AdminAuditLog, DataImportJob
)
from app.utils.enums import UserRole
from pydantic import BaseModel, Field

router = APIRouter()

DOMAIN_INSTITUTION_MAP = {
    "Polytechnic": "Polytechnic College",
    "School": "School",
    "PU College": "Pre-University",
    "MCA": "Degree College",
    "Medical College": "Medical College",
    "Engineering College": "Engineering College"
}

INSTITUTION_TO_DOMAIN_MAP = {v: k for k, v in DOMAIN_INSTITUTION_MAP.items()}

DOMAIN_COURSES = {
    "Polytechnic": ["Diploma - Civil", "Diploma - Electrical", "Diploma - Mechanical", "Diploma - Computer"],
    "School": ["Class 1-5", "Class 6-8", "Class 9-10"],
    "PU College": ["Science (PCMB)", "Commerce", "Arts"],
    "MCA": ["BCA", "BBA", "B.Sc", "B.Com", "MCA"],
    "Medical College": ["MBBS", "BDS", "B.Sc Nursing"],
    "Engineering College": ["Computer Science", "Electronics & Comm.", "Electrical", "Mechanical", "Civil"]
}

def get_admin_context(current_user: User, db: Session):
    """
    Returns (profile, allowed_domain).
    If allowed_domain is None, user has cross-domain (Trust-level) access.
    """
    profile = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()
    if not profile and current_user.email:
        profile = db.query(AdminProfile).filter(AdminProfile.email == current_user.email).first()

    if not profile:
        # Default Trust Admin
        return None, None

    if profile.account_status != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin account is {profile.account_status}. Access restricted."
        )

    if profile.access_scope == "All Domains" or profile.domain == "All Domains":
        return profile, None

    return profile, profile.domain


def log_admin_audit(db: Session, actor_id: str, actor_name: str, actor_email: str, action: str, record_id: str, domain: str, details: dict, outcome: str = "SUCCESS"):
    log = AdminAuditLog(
        actor_id=actor_id,
        actor_name=actor_name,
        actor_email=actor_email,
        action=action,
        affected_record_id=record_id,
        domain=domain,
        details=details,
        outcome=outcome
    )
    db.add(log)
    db.commit()


# =========================================================================
# 1. DASHBOARD OVERVIEW & ANALYTICS
# =========================================================================

@router.get("/overview")
def get_admin_overview(
    domain_filter: Optional[str] = Query(None),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)
    active_domain = allowed_domain or domain_filter

    # Admission applications query scoped to domain
    app_query = db.query(AdmissionApplication)
    if active_domain and active_domain != "All Domains":
        app_query = app_query.filter(AdmissionApplication.educational_domain == active_domain)

    total_admissions = app_query.count()
    awaiting_review = app_query.filter(AdmissionApplication.application_status == "UNDER_REVIEW").count()
    incomplete = app_query.filter(AdmissionApplication.application_status.in_(["RETURNED_FOR_CORRECTION", "SUBMITTED"])).count()
    approved = app_query.filter(AdmissionApplication.application_status == "APPROVED").count()
    rejected = app_query.filter(AdmissionApplication.application_status == "REJECTED").count()
    pending_verification = app_query.filter(AdmissionApplication.document_verification_status == "PENDING").count()

    # Students query scoped to domain
    stu_query = db.query(Student)
    if active_domain and active_domain != "All Domains":
        inst_name = DOMAIN_INSTITUTION_MAP.get(active_domain)
        if inst_name:
            stu_query = stu_query.filter(Student.institution == inst_name)
    total_students = stu_query.count()

    # Recent Audit Activities
    audit_query = db.query(AdminAuditLog)
    if active_domain and active_domain != "All Domains":
        audit_query = audit_query.filter(AdminAuditLog.domain.in_([active_domain, "All Domains"]))
    recent_activities = audit_query.order_by(desc(AdminAuditLog.created_at)).limit(6).all()

    # Charts data calculation
    # 1. Status distribution
    status_counts = (
        app_query.with_entities(AdmissionApplication.application_status, func.count(AdmissionApplication.id))
        .group_by(AdmissionApplication.application_status)
        .all()
    )
    status_chart = [{"name": s[0].replace("_", " ").title(), "value": s[1]} for s in status_counts]

    # 2. Course distribution
    course_counts = (
        app_query.with_entities(AdmissionApplication.course_or_class, func.count(AdmissionApplication.id))
        .group_by(AdmissionApplication.course_or_class)
        .all()
    )
    course_chart = [{"course": c[0], "count": c[1]} for c in course_counts]

    # 3. Monthly trend (last 6 months)
    monthly_data = [
        {"month": "May", "applications": 12, "approved": 8},
        {"month": "Jun", "applications": 18, "approved": 14},
        {"month": "Jul", "applications": 25, "approved": 20},
        {"month": "Aug", "applications": 19, "approved": 16},
        {"month": "Sep", "applications": 15, "approved": 12},
        {"month": "Oct", "applications": 14, "approved": approved if approved > 0 else 10},
    ]

    # 4. Verification ratio
    verified_docs = app_query.filter(AdmissionApplication.document_verification_status == "VERIFIED").count()
    verification_chart = [
        {"name": "Verified Documents", "count": verified_docs},
        {"name": "Pending Verification", "count": pending_verification}
    ]

    return {
        "admin_id": profile.admin_id if profile else "ADM-TRUST-001",
        "admin_name": profile.admin_name if profile else "Trust Administrator",
        "email": profile.email if profile else current_user.email,
        "role": profile.role if profile else "Trust Administrator",
        "assigned_domain": profile.domain if profile else "All Domains",
        "access_scope": profile.access_scope if profile else "All Domains",
        "account_status": profile.account_status if profile else "Active",
        "preferred_language": profile.preferred_language if profile else "en",
        "active_domain": active_domain or "All Domains",
        "is_cross_domain_admin": (allowed_domain is None),
        "metrics": {
            "total_admissions_processed": total_admissions,
            "total_students_in_domain": total_students,
            "awaiting_review": awaiting_review,
            "incomplete_applications": incomplete,
            "admissions_approved": approved,
            "admissions_rejected": rejected,
            "pending_verification": pending_verification,
        },
        "charts": {
            "status_distribution": status_chart,
            "course_distribution": course_chart,
            "monthly_trend": monthly_data,
            "verification_ratio": verification_chart,
        },
        "recent_activities": [
            {
                "id": a.id,
                "actor_name": a.actor_name,
                "action": a.action.replace("_", " ").title(),
                "record_id": a.affected_record_id,
                "domain": a.domain,
                "outcome": a.outcome,
                "time": a.created_at.strftime("%d %b %Y, %I:%M %p") if a.created_at else None
            }
            for a in recent_activities
        ]
    }


# =========================================================================
# 2. ADMISSIONS MANAGEMENT
# =========================================================================

class CreateAdmissionRequest(BaseModel):
    student_name: str
    email: Optional[str] = None
    contact_number: str
    parent_name: Optional[str] = None
    parent_contact: Optional[str] = None
    gender: str = "Male"
    date_of_birth: Optional[date] = None
    educational_domain: str
    course_or_class: str
    academic_year: str = "2026-2027"
    admission_category: str = "General"
    previous_qualification: Optional[str] = None
    previous_percentage: Optional[float] = None
    fee_amount: float = 0.0


class UpdateAdmissionStatusRequest(BaseModel):
    status: str  # APPROVED, REJECTED, RETURNED_FOR_CORRECTION, UNDER_REVIEW
    rejection_reason: Optional[str] = None
    correction_notes: Optional[str] = None


@router.get("/admissions")
def get_admissions_list(
    domain: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)
    
    query = db.query(AdmissionApplication)

    # Strict domain enforcement
    if allowed_domain:
        query = query.filter(AdmissionApplication.educational_domain == allowed_domain)
    elif domain and domain != "All Domains":
        query = query.filter(AdmissionApplication.educational_domain == domain)

    if status and status != "ALL":
        query = query.filter(AdmissionApplication.application_status == status)

    if course and course != "ALL":
        query = query.filter(AdmissionApplication.course_or_class.ilike(f"%{course}%"))

    if academic_year and academic_year != "ALL":
        query = query.filter(AdmissionApplication.academic_year == academic_year)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                AdmissionApplication.student_name.ilike(s),
                AdmissionApplication.application_id.ilike(s),
                AdmissionApplication.student_id.ilike(s),
                AdmissionApplication.contact_number.ilike(s),
                AdmissionApplication.email.ilike(s)
            )
        )

    total = query.count()

    # Sorting
    sort_column = getattr(AdmissionApplication, sort_by, AdmissionApplication.created_at)
    if order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        "items": [
            {
                "id": a.id,
                "application_id": a.application_id,
                "student_id": a.student_id,
                "student_name": a.student_name,
                "email": a.email,
                "contact_number": a.contact_number,
                "educational_domain": a.educational_domain,
                "course_or_class": a.course_or_class,
                "academic_year": a.academic_year,
                "admission_category": a.admission_category,
                "previous_percentage": a.previous_percentage,
                "application_date": a.application_date.strftime("%Y-%m-%d") if a.application_date else None,
                "application_status": a.application_status,
                "document_verification_status": a.document_verification_status,
                "fee_status": a.fee_status,
                "fee_amount": a.fee_amount,
                "assigned_admin_id": a.assigned_admin_id,
                "rejection_reason": a.rejection_reason,
                "correction_notes": a.correction_notes,
                "last_updated": a.updated_at.strftime("%d %b %Y, %I:%M %p") if a.updated_at else None,
            }
            for a in items
        ]
    }


@router.post("/admissions")
def create_admission_application(
    req: CreateAdmissionRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    # Domain restriction check: Section 9
    if allowed_domain and req.educational_domain != allowed_domain:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unauthorized: You are assigned to '{allowed_domain}' and cannot create admissions for '{req.educational_domain}'."
        )

    # Generate unique application ID
    dom_prefix = req.educational_domain[:3].upper()
    random_seq = random.randint(2000, 9999)
    app_id = f"APP-2026-{dom_prefix}-{random_seq}"

    # Ensure uniqueness
    while db.query(AdmissionApplication).filter(AdmissionApplication.application_id == app_id).first():
        random_seq = random.randint(2000, 9999)
        app_id = f"APP-2026-{dom_prefix}-{random_seq}"

    app_entry = AdmissionApplication(
        application_id=app_id,
        student_name=req.student_name.strip(),
        email=req.email.strip() if req.email else None,
        contact_number=req.contact_number.strip(),
        parent_name=req.parent_name.strip() if req.parent_name else None,
        parent_contact=req.parent_contact.strip() if req.parent_contact else None,
        gender=req.gender,
        date_of_birth=req.date_of_birth,
        educational_domain=req.educational_domain,
        course_or_class=req.course_or_class,
        academic_year=req.academic_year,
        admission_category=req.admission_category,
        previous_qualification=req.previous_qualification,
        previous_percentage=req.previous_percentage,
        application_date=date.today(),
        application_status="UNDER_REVIEW",
        document_verification_status="PENDING",
        fee_status="PENDING",
        fee_amount=req.fee_amount,
        assigned_admin_id=profile.admin_id if profile else "ADM-TRUST-001"
    )
    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)

    # Create placeholder documents
    docs = [
        AdmissionDocument(
            application_id=app_id,
            document_type="Marks Card",
            document_name=f"marks_card_{app_id}.pdf",
            file_url="/uploads/documents/sample_marks.pdf",
            verification_status="PENDING"
        ),
        AdmissionDocument(
            application_id=app_id,
            document_type="Aadhaar Card",
            document_name=f"aadhaar_{app_id}.pdf",
            file_url="/uploads/documents/sample_aadhaar.pdf",
            verification_status="PENDING"
        )
    ]
    db.add_all(docs)

    # Log audit
    log_admin_audit(
        db=db,
        actor_id=profile.admin_id if profile else "ADM-TRUST-001",
        actor_name=profile.admin_name if profile else "Trust Admin",
        actor_email=profile.email if profile else current_user.email,
        action="ADMISSION_CREATE",
        record_id=app_id,
        domain=req.educational_domain,
        details={"student_name": req.student_name, "course": req.course_or_class}
    )

    return {
        "message": "Admission application successfully created.",
        "application_id": app_id,
        "status": "UNDER_REVIEW"
    }


@router.get("/admissions/{app_id}")
def get_admission_detail(
    app_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    app_entry = db.query(AdmissionApplication).filter(AdmissionApplication.application_id == app_id).first()
    if not app_entry:
        raise HTTPException(status_code=404, detail="Admission application not found.")

    if allowed_domain and app_entry.educational_domain != allowed_domain:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unauthorized domain access. Your access scope is restricted to '{allowed_domain}'."
        )

    docs = db.query(AdmissionDocument).filter(AdmissionDocument.application_id == app_id).all()
    logs = db.query(AdminAuditLog).filter(AdminAuditLog.affected_record_id == app_id).order_by(desc(AdminAuditLog.created_at)).all()

    return {
        "application": {
            "id": app_entry.id,
            "application_id": app_entry.application_id,
            "student_id": app_entry.student_id,
            "student_name": app_entry.student_name,
            "email": app_entry.email,
            "contact_number": app_entry.contact_number,
            "parent_name": app_entry.parent_name,
            "parent_contact": app_entry.parent_contact,
            "gender": app_entry.gender,
            "date_of_birth": app_entry.date_of_birth.strftime("%Y-%m-%d") if app_entry.date_of_birth else None,
            "educational_domain": app_entry.educational_domain,
            "course_or_class": app_entry.course_or_class,
            "academic_year": app_entry.academic_year,
            "admission_category": app_entry.admission_category,
            "previous_qualification": app_entry.previous_qualification,
            "previous_percentage": app_entry.previous_percentage,
            "application_date": app_entry.application_date.strftime("%Y-%m-%d") if app_entry.application_date else None,
            "application_status": app_entry.application_status,
            "document_verification_status": app_entry.document_verification_status,
            "fee_status": app_entry.fee_status,
            "fee_amount": app_entry.fee_amount,
            "assigned_admin_id": app_entry.assigned_admin_id,
            "rejection_reason": app_entry.rejection_reason,
            "correction_notes": app_entry.correction_notes,
            "last_updated": app_entry.updated_at.strftime("%d %b %Y, %I:%M %p") if app_entry.updated_at else None,
        },
        "documents": [
            {
                "id": d.id,
                "document_type": d.document_type,
                "document_name": d.document_name,
                "file_url": d.file_url,
                "verification_status": d.verification_status,
                "verified_by": d.verified_by,
                "verified_at": d.verified_at.strftime("%d %b %Y, %I:%M %p") if d.verified_at else None
            }
            for d in docs
        ],
        "audit_trail": [
            {
                "action": l.action,
                "actor_name": l.actor_name,
                "outcome": l.outcome,
                "details": l.details,
                "timestamp": l.created_at.strftime("%d %b %Y, %I:%M %p") if l.created_at else None
            }
            for l in logs
        ]
    }


@router.patch("/admissions/{app_id}/status")
def update_admission_status(
    app_id: str,
    req: UpdateAdmissionStatusRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    app_entry = db.query(AdmissionApplication).filter(AdmissionApplication.application_id == app_id).first()
    if not app_entry:
        raise HTTPException(status_code=404, detail="Admission application not found.")

    if allowed_domain and app_entry.educational_domain != allowed_domain:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unauthorized: You cannot modify admissions for domain '{app_entry.educational_domain}'."
        )

    prev_status = app_entry.application_status
    app_entry.application_status = req.status
    app_entry.rejection_reason = req.rejection_reason if req.status == "REJECTED" else None
    app_entry.correction_notes = req.correction_notes if req.status == "RETURNED_FOR_CORRECTION" else None

    # If approved, generate student_id if not present
    if req.status == "APPROVED" and not app_entry.student_id:
        dom_pfx = app_entry.educational_domain[:3].upper()
        app_entry.student_id = f"STU-{dom_pfx}-{random.randint(1000, 9999)}"
        app_entry.document_verification_status = "VERIFIED"

    app_entry.updated_at = datetime.utcnow()
    db.commit()

    # Log audit
    log_admin_audit(
        db=db,
        actor_id=profile.admin_id if profile else "ADM-TRUST-001",
        actor_name=profile.admin_name if profile else "Trust Admin",
        actor_email=profile.email if profile else current_user.email,
        action=f"ADMISSION_{req.status}",
        record_id=app_id,
        domain=app_entry.educational_domain,
        details={
            "previous_status": prev_status,
            "new_status": req.status,
            "rejection_reason": req.rejection_reason,
            "correction_notes": req.correction_notes
        }
    )

    return {
        "message": f"Admission application status updated to {req.status}.",
        "application_id": app_id,
        "new_status": req.status,
        "student_id": app_entry.student_id
    }


@router.post("/admissions/{app_id}/verify-document")
def verify_admission_document(
    app_id: str,
    document_id: int = Query(...),
    verify_status: str = Query("VERIFIED"), # VERIFIED, REJECTED
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    app_entry = db.query(AdmissionApplication).filter(AdmissionApplication.application_id == app_id).first()
    if not app_entry:
        raise HTTPException(status_code=404, detail="Admission application not found.")

    if allowed_domain and app_entry.educational_domain != allowed_domain:
        raise HTTPException(status_code=403, detail="Unauthorized domain access.")

    doc = db.query(AdmissionDocument).filter(AdmissionDocument.id == document_id, AdmissionDocument.application_id == app_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc.verification_status = verify_status
    doc.verified_by = profile.admin_id if profile else "ADM-TRUST-001"
    doc.verified_at = datetime.utcnow()

    # Check all docs for this app
    all_docs = db.query(AdmissionDocument).filter(AdmissionDocument.application_id == app_id).all()
    if all(d.verification_status == "VERIFIED" for d in all_docs):
        app_entry.document_verification_status = "VERIFIED"
    elif any(d.verification_status == "REJECTED" for d in all_docs):
        app_entry.document_verification_status = "REJECTED"
    else:
        app_entry.document_verification_status = "IN_PROGRESS"

    db.commit()

    return {
        "message": f"Document marked as {verify_status}.",
        "document_id": document_id,
        "overall_verification_status": app_entry.document_verification_status
    }


@router.get("/admissions-export")
def export_admissions_csv(
    domain: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    query = db.query(AdmissionApplication)
    if allowed_domain:
        query = query.filter(AdmissionApplication.educational_domain == allowed_domain)
    elif domain and domain != "All Domains":
        query = query.filter(AdmissionApplication.educational_domain == domain)

    if status and status != "ALL":
        query = query.filter(AdmissionApplication.application_status == status)

    admissions = query.order_by(AdmissionApplication.application_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID", "Student ID", "Student Name", "Email", "Contact Number",
        "Educational Domain", "Course/Class", "Academic Year", "Category",
        "Percentage", "Application Date", "Status", "Verification Status", "Fee Status"
    ])

    for a in admissions:
        writer.writerow([
            a.application_id, a.student_id or "", a.student_name, a.email or "", a.contact_number,
            a.educational_domain, a.course_or_class, a.academic_year, a.admission_category,
            a.previous_percentage or "", a.application_date, a.application_status,
            a.document_verification_status, a.fee_status
        ])

    output.seek(0)
    filename = f"trust_one_admissions_{allowed_domain or domain or 'all'}_{date.today()}.csv"

    # Log export in audit
    log_admin_audit(
        db=db,
        actor_id=profile.admin_id if profile else "ADM-TRUST-001",
        actor_name=profile.admin_name if profile else "Trust Admin",
        actor_email=profile.email if profile else current_user.email,
        action="EXPORT_ADMISSIONS_CSV",
        record_id=filename,
        domain=allowed_domain or domain or "All Domains",
        details={"record_count": len(admissions)}
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =========================================================================
# 3. STUDENT RECORDS DIRECTORY (SCOPED TO DOMAIN)
# =========================================================================

class UpdateStudentPermittedRequest(BaseModel):
    student_name: Optional[str] = None
    parent_contact_no: Optional[str] = None
    student_contact_no: Optional[str] = None
    residence_type: Optional[str] = None
    block: Optional[str] = None
    room_section: Optional[str] = None


class TransferStudentRequest(BaseModel):
    target_domain: str
    target_course: str
    transfer_reason: str


@router.get("/students")
def get_domain_students(
    search: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    query = db.query(Student)

    # Scoped to domain
    if allowed_domain:
        inst_name = DOMAIN_INSTITUTION_MAP.get(allowed_domain)
        if inst_name:
            query = query.filter(Student.institution == inst_name)

    if course and course != "ALL":
        query = query.filter(Student.course_stream.ilike(f"%{course}%"))

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Student.student_name.ilike(s),
                Student.student_id.ilike(s),
                Student.student_email_id.ilike(s),
                Student.parent_contact_no.ilike(s)
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    students = query.order_by(Student.student_id).offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        "domain": allowed_domain or "All Domains",
        "items": [
            {
                "id": s.id,
                "student_id": s.student_id,
                "student_name": s.student_name,
                "institution": s.institution,
                "domain": INSTITUTION_TO_DOMAIN_MAP.get(s.institution, "General"),
                "course_stream": s.course_stream,
                "year_class": s.year_class,
                "gender": s.gender,
                "father_name": s.father_name,
                "mother_name": s.mother_name,
                "parent_contact_no": s.parent_contact_no,
                "student_contact_no": s.student_contact_no,
                "student_email_id": s.student_email_id,
                "residence_type": s.residence_type,
                "block": s.block,
                "room_section": s.room_section,
                "attendance_pct": s.attendance_pct,
                "academic_pct": s.academic_pct,
                "collegefee": s.collegefee,
                "fee_paid": s.fee_paid,
                "balance": s.balance,
                "fee_status": s.fee_status,
            }
            for s in students
        ]
    }


@router.patch("/students/{student_id}")
def update_student_record(
    student_id: str,
    req: UpdateStudentPermittedRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    stu = db.query(Student).filter(Student.student_id == student_id).first()
    if not stu:
        raise HTTPException(status_code=404, detail="Student record not found.")

    if allowed_domain:
        inst_name = DOMAIN_INSTITUTION_MAP.get(allowed_domain)
        if stu.institution != inst_name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unauthorized domain access. Student belongs to '{stu.institution}'."
            )

    changed_fields = {}
    if req.student_name:
        changed_fields["student_name"] = {"old": stu.student_name, "new": req.student_name}
        stu.student_name = req.student_name
    if req.parent_contact_no:
        changed_fields["parent_contact_no"] = {"old": stu.parent_contact_no, "new": req.parent_contact_no}
        stu.parent_contact_no = req.parent_contact_no
    if req.student_contact_no:
        changed_fields["student_contact_no"] = {"old": stu.student_contact_no, "new": req.student_contact_no}
        stu.student_contact_no = req.student_contact_no
    if req.residence_type:
        changed_fields["residence_type"] = {"old": stu.residence_type, "new": req.residence_type}
        stu.residence_type = req.residence_type
    if req.block:
        changed_fields["block"] = {"old": stu.block, "new": req.block}
        stu.block = req.block
    if req.room_section:
        changed_fields["room_section"] = {"old": stu.room_section, "new": req.room_section}
        stu.room_section = req.room_section

    db.commit()

    # Log audit
    log_admin_audit(
        db=db,
        actor_id=profile.admin_id if profile else "ADM-TRUST-001",
        actor_name=profile.admin_name if profile else "Trust Admin",
        actor_email=profile.email if profile else current_user.email,
        action="STUDENT_RECORD_UPDATE",
        record_id=student_id,
        domain=allowed_domain or "All Domains",
        details=changed_fields
    )

    return {
        "message": f"Student record for {student_id} updated successfully.",
        "student_id": student_id,
        "changed_fields": changed_fields
    }


@router.post("/students/{student_id}/transfer")
def transfer_student_domain(
    student_id: str,
    req: TransferStudentRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    stu = db.query(Student).filter(Student.student_id == student_id).first()
    if not stu:
        raise HTTPException(status_code=404, detail="Student record not found.")

    old_institution = stu.institution
    new_institution = DOMAIN_INSTITUTION_MAP.get(req.target_domain)
    if not new_institution:
        raise HTTPException(status_code=400, detail=f"Invalid target domain: {req.target_domain}")

    # Transfer
    stu.institution = new_institution
    stu.course_stream = req.target_course
    db.commit()

    # Log transfer audit
    log_admin_audit(
        db=db,
        actor_id=profile.admin_id if profile else "ADM-TRUST-001",
        actor_name=profile.admin_name if profile else "Trust Admin",
        actor_email=profile.email if profile else current_user.email,
        action="STUDENT_DOMAIN_TRANSFER",
        record_id=student_id,
        domain=req.target_domain,
        details={
            "from_institution": old_institution,
            "to_institution": new_institution,
            "target_course": req.target_course,
            "reason": req.transfer_reason
        }
    )

    return {
        "message": f"Student {student_id} successfully transferred to {req.target_domain}.",
        "student_id": student_id,
        "new_institution": new_institution,
        "new_course": req.target_course
    }


# =========================================================================
# 4. DATA IMPORT MODULE (CSV)
# =========================================================================

@router.post("/import")
async def import_csv_data(
    file: UploadFile = File(...),
    import_type: str = Form("ADMISSIONS"), # ADMISSIONS, STUDENTS, ADMIN_PROFILES
    target_domain: Optional[str] = Form(None),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    if allowed_domain and target_domain and target_domain != allowed_domain:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unauthorized: You cannot import data into domain '{target_domain}'. Your scope is '{allowed_domain}'."
        )

    # Security check: Only Trust Administrator can import admin profiles!
    if import_type == "ADMIN_PROFILES" and allowed_domain:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Only Trust-level administrators may import or provision administrator accounts."
        )

    content = await file.read()
    try:
        text = content.decode('utf-8')
    except Exception:
        text = content.decode('latin-1')

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="The uploaded CSV file is empty or missing headers.")

    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    successful = 0
    rejected = 0
    skipped = 0
    errors = []

    domain_to_use = allowed_domain or target_domain or "Engineering College"

    if import_type == "ADMISSIONS":
        for idx, row in enumerate(rows, 1):
            name = row.get("student_name") or row.get("name")
            phone = row.get("contact_number") or row.get("phone") or row.get("mobile")
            course = row.get("course_or_class") or row.get("course") or "Computer Science"
            dom = row.get("educational_domain") or domain_to_use

            if not name or not phone:
                rejected += 1
                errors.append({"row": idx, "reason": "Missing required fields (student_name or contact_number)."})
                continue

            app_id = f"APP-2026-{dom[:3].upper()}-{random.randint(3000, 9999)}"
            app = AdmissionApplication(
                application_id=app_id,
                student_name=name.strip(),
                email=row.get("email"),
                contact_number=phone.strip(),
                educational_domain=dom,
                course_or_class=course,
                application_status="SUBMITTED",
                document_verification_status="PENDING",
                fee_status="PENDING",
                assigned_admin_id=profile.admin_id if profile else "ADM-TRUST-001"
            )
            db.add(app)
            successful += 1

    elif import_type == "STUDENTS":
        for idx, row in enumerate(rows, 1):
            sid = row.get("student_id") or f"STU-{random.randint(10000, 99999)}"
            name = row.get("student_name") or row.get("name")
            if not name:
                rejected += 1
                errors.append({"row": idx, "reason": "Missing student_name."})
                continue

            inst = DOMAIN_INSTITUTION_MAP.get(domain_to_use, "Engineering College")
            st = Student(
                student_id=sid,
                student_name=name.strip(),
                gender=row.get("gender", "Male"),
                institution=inst,
                course_stream=row.get("course_stream", "General"),
                year_class=row.get("year_class", "Year 1"),
                parent_contact_no=row.get("parent_contact_no", "+91 98765 00000")
            )
            db.add(st)
            successful += 1

    db.commit()

    # Record job
    job = DataImportJob(
        job_id=job_id,
        import_type=import_type,
        filename=file.filename,
        domain=domain_to_use,
        imported_by=profile.admin_id if profile else "ADM-TRUST-001",
        total_rows=len(rows),
        successful_rows=successful,
        rejected_rows=rejected,
        skipped_rows=skipped,
        error_report=errors[:50]
    )
    db.add(job)
    db.commit()

    # Log audit
    log_admin_audit(
        db=db,
        actor_id=profile.admin_id if profile else "ADM-TRUST-001",
        actor_name=profile.admin_name if profile else "Trust Admin",
        actor_email=profile.email if profile else current_user.email,
        action=f"DATA_IMPORT_{import_type}",
        record_id=job_id,
        domain=domain_to_use,
        details={"total": len(rows), "successful": successful, "rejected": rejected}
    )

    return {
        "job_id": job_id,
        "import_type": import_type,
        "total_rows": len(rows),
        "successful_rows": successful,
        "rejected_rows": rejected,
        "skipped_rows": skipped,
        "errors": errors[:20]
    }


# =========================================================================
# 5. REPORTS & ANALYTICS
# =========================================================================

@router.get("/reports")
def get_reports_summary(
    report_type: str = Query("ADMISSIONS_BY_DOMAIN"),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    # Scoped to domain
    app_q = db.query(AdmissionApplication)
    if allowed_domain:
        app_q = app_q.filter(AdmissionApplication.educational_domain == allowed_domain)

    # Generate report
    records = []
    if report_type == "ADMISSIONS_BY_DOMAIN":
        domains = [allowed_domain] if allowed_domain else list(DOMAIN_INSTITUTION_MAP.keys())
        for dom in domains:
            q = db.query(AdmissionApplication).filter(AdmissionApplication.educational_domain == dom)
            tot = q.count()
            appr = q.filter(AdmissionApplication.application_status == "APPROVED").count()
            rej = q.filter(AdmissionApplication.application_status == "REJECTED").count()
            under = q.filter(AdmissionApplication.application_status == "UNDER_REVIEW").count()
            records.append({
                "domain": dom,
                "total_applications": tot,
                "approved": appr,
                "rejected": rej,
                "under_review": under,
                "approval_rate": f"{round((appr / tot * 100), 1)}%" if tot > 0 else "0%"
            })

    elif report_type == "APPLICATION_STATUS":
        stats = (
            app_q.with_entities(AdmissionApplication.application_status, func.count(AdmissionApplication.id))
            .group_by(AdmissionApplication.application_status)
            .all()
        )
        total = app_q.count()
        for s in stats:
            records.append({
                "status": s[0].replace("_", " ").title(),
                "count": s[1],
                "percentage": f"{round(s[1] / total * 100, 1)}%" if total > 0 else "0%"
            })

    elif report_type == "DOCUMENT_VERIFICATION":
        stats = (
            app_q.with_entities(AdmissionApplication.document_verification_status, func.count(AdmissionApplication.id))
            .group_by(AdmissionApplication.document_verification_status)
            .all()
        )
        total = app_q.count()
        for s in stats:
            records.append({
                "verification_status": s[0].replace("_", " ").title(),
                "count": s[1],
                "percentage": f"{round(s[1] / total * 100, 1)}%" if total > 0 else "0%"
            })

    return {
        "report_type": report_type,
        "generated_at": datetime.utcnow().strftime("%d %b %Y, %I:%M %p"),
        "domain_scope": allowed_domain or "All Domains",
        "total_records": len(records),
        "data": records
    }


# =========================================================================
# 6. NOTIFICATIONS
# =========================================================================

@router.get("/notifications")
def get_admin_notifications(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    query = db.query(AdminNotification)
    if allowed_domain:
        query = query.filter(or_(AdminNotification.domain == allowed_domain, AdminNotification.domain == "All Domains"))
    if profile:
        query = query.filter(or_(AdminNotification.recipient_admin_id == profile.admin_id, AdminNotification.recipient_admin_id == None))

    items = query.order_by(desc(AdminNotification.created_at)).limit(30).all()

    return {
        "unread_count": len([i for i in items if not i.is_read]),
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "domain": n.domain,
                "is_read": n.is_read,
                "created_at": n.created_at.strftime("%d %b %Y, %I:%M %p") if n.created_at else None
            }
            for n in items
        ]
    }


@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    n = db.query(AdminNotification).filter(AdminNotification.id == notif_id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "Notification marked as read."}


# =========================================================================
# 7. AUDIT LOGS
# =========================================================================

@router.get("/audit-logs")
def get_audit_logs(
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)

    query = db.query(AdminAuditLog)
    if allowed_domain:
        query = query.filter(or_(AdminAuditLog.domain == allowed_domain, AdminAuditLog.domain == "All Domains"))

    if action and action != "ALL":
        query = query.filter(AdminAuditLog.action == action)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                AdminAuditLog.actor_name.ilike(s),
                AdminAuditLog.actor_id.ilike(s),
                AdminAuditLog.affected_record_id.ilike(s),
                AdminAuditLog.action.ilike(s)
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    items = query.order_by(desc(AdminAuditLog.created_at)).offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        "items": [
            {
                "id": a.id,
                "actor_id": a.actor_id,
                "actor_name": a.actor_name,
                "actor_email": a.actor_email,
                "action": a.action,
                "record_id": a.affected_record_id,
                "domain": a.domain,
                "details": a.details,
                "outcome": a.outcome,
                "timestamp": a.created_at.strftime("%d %b %Y, %I:%M %p") if a.created_at else None
            }
            for a in items
        ]
    }


# =========================================================================
# 8. PROFILE & SETTINGS
# =========================================================================

class UpdateAdminProfileRequest(BaseModel):
    phone: Optional[str] = None
    preferred_language: Optional[str] = None


@router.get("/profile")
def get_admin_profile(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile, allowed_domain = get_admin_context(current_user, db)
    if not profile:
        return {
            "admin_id": "ADM-TRUST-001",
            "admin_name": "Dr. Trust Administrator",
            "email": current_user.email,
            "domain": "All Domains",
            "role": "Trust Super Administrator",
            "access_scope": "All Domains",
            "account_status": "Active",
            "preferred_language": "en",
            "last_login": datetime.utcnow().strftime("%d %b %Y, %I:%M %p")
        }

    return {
        "admin_id": profile.admin_id,
        "admin_name": profile.admin_name,
        "email": profile.email,
        "domain": profile.domain,
        "role": profile.role,
        "access_scope": profile.access_scope,
        "account_status": profile.account_status,
        "phone": profile.phone,
        "preferred_language": profile.preferred_language,
        "last_login": profile.last_login.strftime("%d %b %Y, %I:%M %p") if profile.last_login else None
    }


@router.patch("/profile")
def update_admin_profile(
    req: UpdateAdminProfileRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    profile = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()
    if profile:
        if req.phone:
            profile.phone = req.phone
        if req.preferred_language:
            profile.preferred_language = req.preferred_language
        db.commit()
    return {"message": "Profile updated successfully."}
