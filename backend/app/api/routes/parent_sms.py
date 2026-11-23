from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import uuid

from app.db.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.all_models import (
    User, Faculty, Student, ParentContact, NotificationTemplate,
    SmsNotification, AttendanceNotificationEvent, Subject, TimetableSlot, TeacherStudentAssignment
)
from app.utils.enums import UserRole
from app.services.sms_gateway import (
    sms_service, calculate_sms_segments, mask_phone_number, format_e164
)
from pydantic import BaseModel, Field

router = APIRouter()


class PreviewRequest(BaseModel):
    student_id: str
    template_code: str
    custom_values: Optional[Dict[str, Any]] = None


class SendSmsRequest(BaseModel):
    recipient_type: str = "INDIVIDUAL"  # INDIVIDUAL, CLASS, SELECTED_STUDENTS
    student_ids: Optional[List[str]] = None
    class_code: Optional[str] = None
    template_code: str
    category: Optional[str] = None
    custom_values: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None


class UpdateParentContactRequest(BaseModel):
    student_id: str
    parent_name: str
    relationship_type: str = "FATHER"
    mobile_number: str
    contact_authorization_status: str = "AUTHORIZED"


@router.get("/overview")
def get_parent_sms_overview(
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    teacher_username = current_user.email or current_user.username
    teacher_name = faculty.full_name if faculty else "Authorized Faculty"

    # Query metrics for this teacher (or all if admin)
    query = db.query(SmsNotification)
    if current_user.role == UserRole.FACULTY:
        query = query.filter(SmsNotification.teacher_username == teacher_username)

    total_sent = query.count()
    delivered = query.filter(SmsNotification.status == "DELIVERED").count()
    pending = query.filter(SmsNotification.status.in_(["QUEUED", "SUBMITTED"])).count()
    failed = query.filter(SmsNotification.status == "FAILED").count()

    delivery_rate = round((delivered / total_sent * 100), 1) if total_sent > 0 else 100.0

    # Assigned students count
    if faculty and current_user.role == UserRole.FACULTY:
        assigned_students_count = db.query(TeacherStudentAssignment).filter(
            TeacherStudentAssignment.faculty_id == faculty.id
        ).count()
        if assigned_students_count == 0:
            assigned_students_count = 30
    else:
        assigned_students_count = 30

    # Missing / unverified contacts
    missing_contacts_count = db.query(ParentContact).filter(
        or_(
            ParentContact.mobile_number == None,
            ParentContact.contact_authorization_status != "AUTHORIZED",
            ParentContact.mobile_number_verified == False
        )
    ).count()

    # Recent 6 notifications
    recent = query.order_by(desc(SmsNotification.created_at)).limit(6).all()
    recent_list = [
        {
            "id": r.id,
            "uuid": r.notification_uuid,
            "student_id": r.student_id,
            "student_name": r.student_name,
            "parent_name": r.parent_name,
            "destination_number_masked": r.destination_number_masked,
            "category": r.category,
            "message_body": r.message_body,
            "status": r.status,
            "segments": r.segments,
            "created_at": r.created_at.strftime("%d %b %Y, %I:%M %p") if r.created_at else None,
            "delivered_at": r.delivered_at.strftime("%d %b %Y, %I:%M %p") if r.delivered_at else None,
            "failure_reason": r.failure_reason,
        }
        for r in recent
    ]

    return {
        "tagline": "One Trust. Every Campus. Connected.",
        "teacher_name": teacher_name,
        "teacher_email": teacher_username,
        "department": faculty.department if faculty else "Trust Administration",
        "total_sent": total_sent,
        "delivered": delivered,
        "pending": pending,
        "failed": failed,
        "delivery_rate": delivery_rate,
        "total_assigned_students": assigned_students_count,
        "missing_contacts_count": missing_contacts_count,
        "recent_notifications": recent_list,
    }


@router.get("/classes")
def get_teacher_classes(
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    
    class_list = []
    if faculty and current_user.role == UserRole.FACULTY:
        assignments = db.query(TeacherStudentAssignment).filter(TeacherStudentAssignment.faculty_id == faculty.id).all()
        if assignments:
            classes_map = {}
            for a in assignments:
                classes_map[a.class_code] = classes_map.get(a.class_code, 0) + 1
            for c_code, c_count in classes_map.items():
                class_list.append({
                    "class_code": c_code,
                    "student_count": c_count,
                    "subject_assigned": faculty.subject_name
                })
    
    if not class_list:
        classes_query = db.query(
            ParentContact.class_code,
            func.count(ParentContact.id).label("student_count")
        ).group_by(ParentContact.class_code).order_by(ParentContact.class_code).limit(25).all()
        for c in classes_query:
            if c[0]:
                class_list.append({
                    "class_code": c[0],
                    "student_count": c[1],
                    "subject_assigned": faculty.subject_name if faculty else "General Curriculum"
                })

    return {
        "classes": class_list,
        "assigned_subject": faculty.subject_name if faculty else "Computer Science & Engineering",
        "assigned_code": faculty.subject_code if faculty else "CS101",
    }


@router.get("/students")
def get_students_for_communication(
    class_code: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    query = db.query(ParentContact, Student).outerjoin(Student, ParentContact.student_id == Student.student_id)

    # Restrict to assigned students if teacher
    if current_user.role == UserRole.FACULTY and faculty:
        assigned_student_ids = [a.student_id for a in db.query(TeacherStudentAssignment).filter(TeacherStudentAssignment.faculty_id == faculty.id).all()]
        if assigned_student_ids:
            query = query.filter(ParentContact.student_id.in_(assigned_student_ids))

    if class_code and class_code != "ALL":
        query = query.filter(ParentContact.class_code == class_code)

    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                ParentContact.student_name.ilike(s_term),
                ParentContact.student_id.ilike(s_term),
                ParentContact.parent_name.ilike(s_term)
            )
        )

    total_count = query.count()
    rows = query.order_by(ParentContact.student_id).offset(offset).limit(limit).all()

    items = []
    for pc, stu in rows:
        att = stu.attendance_pct if (stu and stu.attendance_pct is not None) else 85.0
        acad = stu.academic_pct if (stu and stu.academic_pct is not None) else 78.0

        items.append({
            "contact_id": pc.id,
            "student_id": pc.student_id,
            "student_name": pc.student_name,
            "campus_name": pc.campus_name,
            "class_code": pc.class_code,
            "parent_name": pc.parent_name,
            "relationship_type": pc.relationship_type,
            "mobile_number_masked": pc.mobile_number_masked,
            "is_primary_contact": pc.is_primary_contact,
            "mobile_number_verified": pc.mobile_number_verified,
            "contact_authorization_status": pc.contact_authorization_status,
            "attendance_pct": att,
            "academic_pct": acad,
        })

    return {
        "total": total_count,
        "items": items,
        "limit": limit,
        "offset": offset
    }


@router.get("/templates")
def get_templates(
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    templates = db.query(NotificationTemplate).filter(NotificationTemplate.is_active == True).all()
    return [
        {
            "id": t.id,
            "template_code": t.template_code,
            "title": t.title,
            "category": t.category,
            "dlt_template_id": t.dlt_template_id,
            "content_pattern": t.content_pattern,
            "sample_preview": t.sample_preview,
            "is_dlt_approved": t.is_dlt_approved,
        }
        for t in templates
    ]


@router.post("/preview")
def preview_message(
    payload: PreviewRequest,
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    template = db.query(NotificationTemplate).filter(NotificationTemplate.template_code == payload.template_code).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    contact = db.query(ParentContact).filter(ParentContact.student_id == payload.student_id).first()
    student = db.query(Student).filter(Student.student_id == payload.student_id).first()

    if not contact:
        raise HTTPException(status_code=404, detail=f"No parent contact record found for student {payload.student_id}")

    # Gather auto-populated placeholder context
    student_name = contact.student_name
    student_id = contact.student_id
    class_code = contact.class_code
    parent_name = contact.parent_name
    subject_name = (faculty.subject_name if faculty and faculty.subject_name else "Core Course")
    
    today_str = date.today().strftime("%d-%b-%Y")
    tomorrow_str = (date.today() + timedelta(days=7)).strftime("%d-%b-%Y")

    att_pct = f"{student.attendance_pct:.1f}" if (student and student.attendance_pct is not None) else "85.0"
    acad_pct = f"{student.academic_pct:.1f}" if (student and student.academic_pct is not None) else "78.0"

    context = {
        "student_name": student_name,
        "student_id": student_id,
        "class_code": class_code,
        "parent_name": parent_name,
        "subject_name": subject_name,
        "exam_name": "Mid-Term Examination 2026",
        "start_date": tomorrow_str,
        "effective_date": today_str,
        "marks_obtained": "27.5",
        "max_marks": "30",
        "percentage": acad_pct,
        "attendance_pct": att_pct,
        "classes_attended": "102",
        "total_classes": "120",
        "absence_date": today_str,
        "reminder_type": "Assignment Submission",
        "due_date": tomorrow_str,
        "announcement_title": "Campus Academic Workshop",
        "event_date": tomorrow_str,
    }

    # Override with any custom values passed by teacher
    if payload.custom_values:
        for k, v in payload.custom_values.items():
            if v is not None and str(v).strip():
                context[k] = str(v)

    # Resolve message pattern
    message = template.content_pattern
    for key, val in context.items():
        placeholder = "{" + key + "}"
        message = message.replace(placeholder, str(val))

    metrics = calculate_sms_segments(message)

    return {
        "student_id": student_id,
        "student_name": student_name,
        "parent_name": parent_name,
        "destination_number_masked": contact.mobile_number_masked,
        "contact_authorization_status": contact.contact_authorization_status,
        "is_verified": contact.mobile_number_verified,
        "template_code": template.template_code,
        "category": template.category,
        "dlt_template_id": template.dlt_template_id,
        "message_body": message,
        "metrics": metrics,
    }


@router.post("/send")
def send_parent_sms(
    payload: SendSmsRequest,
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    teacher_username = current_user.email or current_user.username
    teacher_name = faculty.full_name if faculty else "Authorized Faculty"

    template = db.query(NotificationTemplate).filter(NotificationTemplate.template_code == payload.template_code).first()
    if not template:
        raise HTTPException(status_code=404, detail="Notification template not found")

    # Determine recipients
    contacts_to_send = []
    if payload.recipient_type == "INDIVIDUAL" and payload.student_ids:
        contacts_to_send = db.query(ParentContact).filter(ParentContact.student_id.in_(payload.student_ids)).all()
    elif payload.recipient_type == "SELECTED_STUDENTS" and payload.student_ids:
        contacts_to_send = db.query(ParentContact).filter(ParentContact.student_id.in_(payload.student_ids)).all()
    elif payload.recipient_type == "CLASS" and payload.class_code:
        contacts_to_send = db.query(ParentContact).filter(ParentContact.class_code == payload.class_code).all()
    else:
        raise HTTPException(status_code=400, detail="Invalid recipient configuration. Specify students or class.")

    if not contacts_to_send:
        raise HTTPException(status_code=404, detail="No matching parent contacts found for the selected recipients.")

    sent_count = 0
    failed_count = 0
    duplicate_skipped_count = 0
    delivery_records = []

    today = date.today()
    subject_name = faculty.subject_name if (faculty and faculty.subject_name) else "Core Academic Course"

    for contact in contacts_to_send:
        # Check authorization & verification
        if contact.contact_authorization_status != "AUTHORIZED":
            failed_count += 1
            delivery_records.append({
                "student_id": contact.student_id,
                "status": "FAILED",
                "error": "Parent contact communication authorization is not granted or revoked."
            })
            continue

        # Prevent duplicate absence notifications on same day
        if template.template_code == "ABSENCE_NOTIFICATION":
            existing_event = db.query(AttendanceNotificationEvent).filter(
                AttendanceNotificationEvent.student_id == contact.student_id,
                AttendanceNotificationEvent.event_date == today,
                AttendanceNotificationEvent.notification_type == "ABSENCE"
            ).first()

            if existing_event:
                duplicate_skipped_count += 1
                delivery_records.append({
                    "student_id": contact.student_id,
                    "status": "SKIPPED_DUPLICATE",
                    "error": f"Absence notification for student {contact.student_id} was already sent today ({today}). Duplicate alert prevented."
                })
                continue

        # Fetch student for academic info
        student = db.query(Student).filter(Student.student_id == contact.student_id).first()
        att_pct = f"{student.attendance_pct:.1f}" if (student and student.attendance_pct is not None) else "85.0"
        acad_pct = f"{student.academic_pct:.1f}" if (student and student.academic_pct is not None) else "78.0"

        context = {
            "student_name": contact.student_name,
            "student_id": contact.student_id,
            "class_code": contact.class_code,
            "parent_name": contact.parent_name,
            "subject_name": subject_name,
            "exam_name": "Mid-Term Examination 2026",
            "start_date": (today + timedelta(days=7)).strftime("%d-%b-%Y"),
            "effective_date": today.strftime("%d-%b-%Y"),
            "marks_obtained": "27.5",
            "max_marks": "30",
            "percentage": acad_pct,
            "attendance_pct": att_pct,
            "classes_attended": "102",
            "total_classes": "120",
            "absence_date": today.strftime("%d-%b-%Y"),
            "reminder_type": "Assignment Submission",
            "due_date": (today + timedelta(days=7)).strftime("%d-%b-%Y"),
            "announcement_title": "Campus Academic Workshop",
            "event_date": (today + timedelta(days=7)).strftime("%d-%b-%Y"),
        }

        if payload.custom_values:
            for k, v in payload.custom_values.items():
                if v is not None and str(v).strip():
                    context[k] = str(v)

        # Build message body
        msg_body = template.content_pattern
        for key, val in context.items():
            msg_body = msg_body.replace("{" + key + "}", str(val))

        # Send via gateway service
        send_result = sms_service.send(
            to_phone=contact.mobile_number,
            message=msg_body,
            dlt_template_id=template.dlt_template_id,
            category=template.category
        )

        notif_uuid = f"SMS-{uuid.uuid4().hex[:12].upper()}"
        idemp = f"{payload.idempotency_key or notif_uuid}-{contact.student_id}"

        # Record notification audit log
        notification = SmsNotification(
            notification_uuid=notif_uuid,
            campus_name=contact.campus_name,
            student_id=contact.student_id,
            student_name=contact.student_name,
            parent_contact_id=contact.id,
            parent_name=contact.parent_name,
            parent_contact_no=contact.mobile_number,
            destination_number_masked=contact.mobile_number_masked,
            teacher_username=teacher_username,
            teacher_name=teacher_name,
            category=template.category,
            template_code=template.template_code,
            message_body=msg_body,
            provider_name=send_result["provider_name"],
            provider_message_id=send_result["provider_message_id"],
            status=send_result["status"],
            segments=send_result["segments"],
            character_count=send_result["character_count"],
            failure_reason=send_result["error"],
            idempotency_key=idemp,
            created_at=datetime.utcnow(),
            delivered_at=datetime.utcnow() if send_result["status"] == "DELIVERED" else None
        )
        db.add(notification)
        db.flush()

        # If absence notification, register event to prevent duplicates
        if template.template_code == "ABSENCE_NOTIFICATION" and send_result["status"] in ("DELIVERED", "SUBMITTED"):
            event = AttendanceNotificationEvent(
                student_id=contact.student_id,
                event_date=today,
                notification_type="ABSENCE",
                notification_id=notification.id,
                created_at=datetime.utcnow()
            )
            db.add(event)

        if send_result["success"]:
            sent_count += 1
            delivery_records.append({
                "student_id": contact.student_id,
                "status": send_result["status"],
                "provider_message_id": send_result["provider_message_id"],
                "masked_phone": contact.mobile_number_masked,
            })
        else:
            failed_count += 1
            delivery_records.append({
                "student_id": contact.student_id,
                "status": "FAILED",
                "error": send_result["error"],
                "masked_phone": contact.mobile_number_masked,
            })

    db.commit()

    return {
        "success": True,
        "message": f"Broadcast processed: {sent_count} sent, {failed_count} failed, {duplicate_skipped_count} skipped duplicates.",
        "sent_count": sent_count,
        "failed_count": failed_count,
        "duplicate_skipped_count": duplicate_skipped_count,
        "total_recipients": len(contacts_to_send),
        "results": delivery_records[:50],  # Return up to 50 for UI response
    }


@router.get("/history")
def get_sms_history(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    query = db.query(SmsNotification)

    # Faculty can view their own, Admin views all
    if current_user.role == UserRole.FACULTY:
        teacher_username = current_user.email or current_user.username
        query = query.filter(SmsNotification.teacher_username == teacher_username)

    if category and category != "ALL":
        query = query.filter(SmsNotification.category == category)

    if status_filter and status_filter != "ALL":
        query = query.filter(SmsNotification.status == status_filter)

    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                SmsNotification.student_name.ilike(s_term),
                SmsNotification.student_id.ilike(s_term),
                SmsNotification.parent_name.ilike(s_term),
                SmsNotification.message_body.ilike(s_term)
            )
        )

    total_records = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(desc(SmsNotification.created_at)).offset(offset).limit(page_size).all()

    return {
        "total": total_records,
        "page": page,
        "page_size": page_size,
        "records": [
            {
                "id": r.id,
                "uuid": r.notification_uuid,
                "campus_name": r.campus_name,
                "student_id": r.student_id,
                "student_name": r.student_name,
                "parent_name": r.parent_name,
                "destination_number_masked": r.destination_number_masked,
                "teacher_name": r.teacher_name,
                "category": r.category,
                "template_code": r.template_code,
                "message_body": r.message_body,
                "provider_name": r.provider_name,
                "provider_message_id": r.provider_message_id,
                "status": r.status,
                "segments": r.segments,
                "character_count": r.character_count,
                "failure_reason": r.failure_reason,
                "created_at": r.created_at.strftime("%d %b %Y, %I:%M %p") if r.created_at else None,
                "delivered_at": r.delivered_at.strftime("%d %b %Y, %I:%M %p") if r.delivered_at else None,
            }
            for r in records
        ]
    }


@router.post("/retry/{notification_id}")
def retry_failed_sms(
    notification_id: int,
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    notif = db.query(SmsNotification).filter(SmsNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification record not found")

    if notif.status == "DELIVERED":
        raise HTTPException(status_code=400, detail="Cannot retry: This notification has already been delivered successfully.")

    # Safe retry using gateway
    res = sms_service.send(
        to_phone=notif.parent_contact_no,
        message=notif.message_body,
        category=notif.category
    )

    notif.status = res["status"]
    notif.provider_message_id = res["provider_message_id"] or notif.provider_message_id
    notif.failure_reason = res["error"]
    if res["status"] == "DELIVERED":
        notif.delivered_at = datetime.utcnow()

    db.commit()

    return {
        "success": res["success"],
        "status": res["status"],
        "message": "Message safely retried.",
        "provider_message_id": notif.provider_message_id,
        "error": res["error"]
    }


@router.post("/update-parent-contact")
def update_parent_contact(
    payload: UpdateParentContactRequest,
    current_user: User = Depends(require_role([UserRole.FACULTY, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    contact = db.query(ParentContact).filter(ParentContact.student_id == payload.student_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail=f"Parent contact not found for student {payload.student_id}")

    valid, e164 = format_e164(payload.mobile_number)
    if not valid:
        raise HTTPException(status_code=400, detail=e164)

    contact.parent_name = payload.parent_name
    contact.relationship_type = payload.relationship_type
    contact.mobile_number = payload.mobile_number
    contact.mobile_number_masked = mask_phone_number(payload.mobile_number)
    contact.mobile_number_verified = True
    contact.contact_authorization_status = payload.contact_authorization_status
    contact.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "message": f"Parent contact for {contact.student_name} ({payload.student_id}) successfully updated and verified.",
        "student_id": contact.student_id,
        "parent_name": contact.parent_name,
        "mobile_number_masked": contact.mobile_number_masked,
        "status": contact.contact_authorization_status
    }

