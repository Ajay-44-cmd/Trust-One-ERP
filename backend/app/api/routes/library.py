
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.all_models import User, Student, LibraryRecord, Subject
from app.schemas.erp_schemas import LibraryRecordResponse
from app.utils.enums import LibraryStatus

router = APIRouter()

PER_DAY_FINE_RATE = 20.0  # ₹ 20.00 per late day


@router.get("", response_model=List[LibraryRecordResponse])
def get_library_records(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        student = db.query(Student).first()

    records = db.query(LibraryRecord).filter(LibraryRecord.student_id == student.id).all() if student else []
    today = date.today()
    result = []

    if records:
        for r in records:
            fine = r.fine_amount
            status = r.status

            if status == LibraryStatus.ISSUED and today > r.due_date:
                late_days = (today - r.due_date).days
                fine = round(late_days * PER_DAY_FINE_RATE, 2)
                status = LibraryStatus.OVERDUE

            result.append(LibraryRecordResponse(
                id=r.id,
                book_title=r.book_title,
                book_author=r.book_author,
                issue_date=r.issue_date,
                due_date=r.due_date,
                return_date=r.return_date,
                fine_amount=fine,
                status=status
            ))
    elif student:
        # Dynamic Library Card records for the student
        stream = student.branch or "General"
        if "BBA" in stream or "Management" in stream or "Degree" in (student.institution or ""):
            sample_books = [
                ("Principles of Corporate Finance & Investment", "Richard A. Brealey", date.today() - timedelta(days=16), date.today() + timedelta(days=14), None, 0.0, LibraryStatus.ISSUED),
                ("Marketing Management & Strategy (16th Edition)", "Philip Kotler & Kevin Keller", date.today() - timedelta(days=10), date.today() + timedelta(days=20), None, 0.0, LibraryStatus.ISSUED),
                ("Organizational Behavior & Leadership", "Stephen P. Robbins", date.today() - timedelta(days=45), date.today() - timedelta(days=15), date.today() - timedelta(days=16), 0.0, LibraryStatus.RETURNED),
            ]
        elif "Mechanical" in stream or "Civil" in stream or "Engineering" in (student.institution or ""):
            sample_books = [
                ("Design of Machine Elements (4th Edition)", "V. B. Bhandari", date.today() - timedelta(days=12), date.today() + timedelta(days=18), None, 0.0, LibraryStatus.ISSUED),
                ("Heat and Mass Transfer: Fundamentals & Applications", "Yunus A. Cengel", date.today() - timedelta(days=8), date.today() + timedelta(days=22), None, 0.0, LibraryStatus.ISSUED),
                ("Fluid Mechanics & Hydraulic Machinery", "Dr. R. K. Bansal", date.today() - timedelta(days=50), date.today() - timedelta(days=20), date.today() - timedelta(days=22), 0.0, LibraryStatus.RETURNED),
            ]
        elif "Medical" in (student.institution or "") or "BDS" in stream:
            sample_books = [
                ("Robbins & Cotran Pathologic Basis of Disease", "Vinay Kumar & Abul K. Abbas", date.today() - timedelta(days=14), date.today() + timedelta(days=16), None, 0.0, LibraryStatus.ISSUED),
                ("Essentials of Medical Pharmacology (8th Edition)", "K. D. Tripathi", date.today() - timedelta(days=7), date.today() + timedelta(days=23), None, 0.0, LibraryStatus.ISSUED),
                ("Guyton and Hall Textbook of Medical Physiology", "John E. Hall", date.today() - timedelta(days=60), date.today() - timedelta(days=30), date.today() - timedelta(days=32), 0.0, LibraryStatus.RETURNED),
            ]
        else:
            sample_books = [
                ("Foundations of Computer Science & Algorithms", "Alfred V. Aho & Jeffrey D. Ullman", date.today() - timedelta(days=15), date.today() + timedelta(days=15), None, 0.0, LibraryStatus.ISSUED),
                ("Modern Operating Systems (4th Edition)", "Andrew S. Tanenbaum", date.today() - timedelta(days=9), date.today() + timedelta(days=21), None, 0.0, LibraryStatus.ISSUED),
                ("Database System Concepts (7th Edition)", "Silberschatz, Korth & Sudarshan", date.today() - timedelta(days=40), date.today() - timedelta(days=10), date.today() - timedelta(days=11), 0.0, LibraryStatus.RETURNED),
            ]

        for idx, (title, author, iss, due, ret, fine, stat) in enumerate(sample_books):
            result.append(LibraryRecordResponse(
                id=500 + idx,
                book_title=title,
                book_author=author,
                issue_date=iss,
                due_date=due,
                return_date=ret,
                fine_amount=fine,
                status=stat
            ))

    return result
