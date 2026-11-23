from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Date, ForeignKey, Enum as SQLEnum, Text, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.enums import (
    UserRole, AttendanceStatus, NocStatus, AssessmentType,
    FeeStatus, LibraryStatus, GrievanceStatus, MaterialType,
    BookCategory, BookOrderType, BookOrderStatus
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship("Student", back_populates="user", uselist=False)
    faculty_profile = relationship("Faculty", back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    student_id = Column(String, unique=True, index=True, nullable=True)
    student_name = Column(String, nullable=True)
    gender = Column(String, default="Male")
    father_name = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    institution = Column(String, default="Trust One Institute of Technology")
    course_stream = Column(String, nullable=True)
    year_class = Column(String, nullable=True)
    block = Column(String, default="Block B")
    room_section = Column(String, nullable=True)
    lab_exam_fee = Column(Float, nullable=True)
    hostel_fee = Column(Float, nullable=True)
    collegefee = Column(Float, nullable=True)
    fee_paid = Column(Float, nullable=True)
    balance = Column(Float, nullable=True)
    fee_status = Column(String, default="Paid")
    attendance_pct = Column("attendance(%)", Float, nullable=True)
    academic_pct = Column("academic(%)", Float, nullable=True)
    residence_type = Column(String, default="Hosteller")
    parent_contact_no = Column(String, nullable=True)
    student_contact_no = Column(String, nullable=True)
    student_email_id = Column(String, nullable=True)
    password = Column(String, nullable=True)
    fee_concession = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Dynamic properties for compatibility with existing routes and schemas
    @property
    def full_name(self):
        return self.student_name or "Student"

    @property
    def enrollment_number(self):
        return self.student_id or f"STU{self.id}"

    @property
    def college_id(self):
        return self.student_id or f"STU{self.id}"

    @property
    def usn(self):
        return self.student_id or f"STU{self.id}"

    @property
    def branch(self):
        return self.course_stream or "General"

    @property
    def email(self):
        return self.student_email_id or "student@college.edu"

    @property
    def phone(self):
        return self.student_contact_no or ""

    @property
    def parent_phone(self):
        return self.parent_contact_no or ""

    @property
    def section(self):
        return self.room_section or "A"

    @property
    def tuition_fee(self):
        return float(self.collegefee or 65000.0)

    @property
    def exam_fee(self):
        return float(self.lab_exam_fee or 3500.0)

    @property
    def fee_concession_percent(self):
        return float(self.fee_concession or 10.0)

    @property
    def cgpa(self):
        if self.academic_pct:
            return round(float(self.academic_pct) / 9.5, 2)
        return 8.5

    @property
    def backlogs(self):
        return 0

    @property
    def date_of_birth(self):
        return None

    @property
    def skills(self):
        return None

    @property
    def resume_link(self):
        return None

    @property
    def github_link(self):
        return None

    @property
    def linkedin_link(self):
        return None

    @property
    def preferred_roles(self):
        return None

    @property
    def admission_year(self):
        return 2024

    @property
    def current_semester(self):
        if self.year_class:
            if "1" in str(self.year_class): return 2
            if "2" in str(self.year_class): return 4
            if "3" in str(self.year_class): return 6
            if "4" in str(self.year_class): return 8
        return 4

    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("Enrollment", back_populates="student")
    attendances = relationship("Attendance", back_populates="student")
    registrations = relationship("Registration", back_populates="student")
    noc_applications = relationship("NocApplication", back_populates="student")
    fees = relationship("Fee", back_populates="student")
    marks = relationship("Mark", back_populates="student")
    library_records = relationship("LibraryRecord", back_populates="student")


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    subject_code = Column(String, nullable=True)
    subject_name = Column(String, nullable=True)

    user = relationship("User", back_populates="faculty_profile")




class TeacherStudentAssignment(Base):
    __tablename__ = "teacher_student_assignments"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_name = Column(String, nullable=False)
    faculty_email = Column(String, nullable=False)
    student_id = Column(String, nullable=False, index=True)
    student_name = Column(String, nullable=False)
    subject_code = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    class_code = Column(String, nullable=False, index=True)
    section = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, default="2026-2027")
    created_at = Column(DateTime, default=datetime.utcnow)


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    semester_number = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=False)

    subjects = relationship("Subject", back_populates="semester")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    subject_code = Column(String, unique=True, index=True, nullable=False)
    subject_name = Column(String, nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    branch = Column(String, nullable=False)
    credits = Column(Integer, default=3)

    semester = relationship("Semester", back_populates="subjects")
    enrollments = relationship("Enrollment", back_populates="subject")
    attendances = relationship("Attendance", back_populates="subject")
    marks = relationship("Mark", back_populates="subject")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject", back_populates="enrollments")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(SQLEnum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    class_number = Column(Integer, default=1)
    edit_count = Column(Integer, default=0)

    student = relationship("Student", back_populates="attendances")
    subject = relationship("Subject", back_populates="attendances")


class AttendanceResetEvent(Base):
    __tablename__ = "attendance_reset_events"

    id = Column(Integer, primary_key=True, index=True)
    reset_type = Column(String, nullable=False)  # e.g., 'SESSIONAL_1', 'SESSIONAL_2', 'SEMESTER'
    effective_date = Column(Date, nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    academic_year = Column(String, nullable=False)
    registration_date = Column(Date, default=date.today)
    status = Column(String, default="APPROVED")
    registration_number = Column(String, unique=True, nullable=False)
    remarks = Column(String, nullable=True)

    student = relationship("Student", back_populates="registrations")


class NocApplication(Base):
    __tablename__ = "noc_applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    application_type = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(SQLEnum(NocStatus), default=NocStatus.PENDING, nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=True)

    student = relationship("Student", back_populates="noc_applications")


class Fee(Base):
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    total_fee = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0)
    payment_date = Column(Date, nullable=True)
    payment_status = Column(SQLEnum(FeeStatus), default=FeeStatus.PENDING, nullable=False)
    receipt_number = Column(String, nullable=True)

    student = relationship("Student", back_populates="fees")


class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    assessment_type = Column(SQLEnum(AssessmentType), nullable=False)
    marks = Column(Float, nullable=False)
    maximum_marks = Column(Float, default=30.0)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="marks")
    subject = relationship("Subject", back_populates="marks")


class LibraryRecord(Base):
    __tablename__ = "library_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    book_title = Column(String, nullable=False)
    book_author = Column(String, nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    fine_amount = Column(Float, default=0.0)
    status = Column(SQLEnum(LibraryStatus), default=LibraryStatus.ISSUED, nullable=False)

    student = relationship("Student", back_populates="library_records")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_grievance = Column(Boolean, default=False)
    grievance_status = Column(SQLEnum(GrievanceStatus), default=GrievanceStatus.OPEN, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    job_role = Column(String, nullable=False)
    eligibility_criteria = Column(Text, nullable=False)
    drive_date = Column(Date, nullable=False)
    application_deadline = Column(Date, nullable=False)
    salary_package = Column(String, nullable=False)
    preparation_resources = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    comments = relationship("ForumComment", back_populates="post", cascade="all, delete-orphan")


class ForumComment(Base):
    __tablename__ = "forum_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("ForumPost", back_populates="comments")


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(Integer, primary_key=True, index=True)
    semester = Column(Integer, nullable=False)
    branch = Column(String, nullable=False)
    section = Column(String, nullable=False)
    period_number = Column(Integer, default=1)
    subject_code = Column(String, nullable=True)
    subject_name = Column(String, nullable=False)
    faculty_name = Column(String, nullable=False)
    day_of_week = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    room_number = Column(String, nullable=False)


class AcademicMaterial(Base):
    __tablename__ = "academic_materials"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    subject_code = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    uploaded_by_name = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    external_link = Column(String, nullable=True)
    material_type = Column(SQLEnum(MaterialType), default=MaterialType.NOTE, nullable=False)
    target_year = Column(Integer, nullable=True)  # 1, 2, 3, 4 (None = All years)
    semester_number = Column(Integer, nullable=True)  # 1 to 8 (None = All semesters)
    target_branch = Column(String, nullable=True)  # e.g., "Computer Science & Engineering" (None = All branches)
    target_section = Column(String, nullable=True)  # e.g., "A", "B" (None = All sections)
    due_date = Column(Date, nullable=True)
    upload_date = Column(Date, default=date.today)


class StoreBook(Base):
    __tablename__ = "store_books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    category = Column(SQLEnum(BookCategory), default=BookCategory.COMPUTER_SCIENCE, nullable=False)
    price = Column(Float, default=0.0, nullable=False)  # in INR (₹) for offline purchase
    borrow_fee = Column(Float, default=50.0, nullable=False)  # in INR (₹) for 1-month borrow
    rating = Column(Float, default=4.5)
    cover_image = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    publisher = Column(String, nullable=True)
    edition = Column(String, default="Latest Edition")
    stock_quantity = Column(Integer, default=10)
    is_available = Column(Boolean, default=True)
    expected_restock_date = Column(Date, nullable=True)  # e.g., date when out of stock will be replenished
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("StoreOrder", back_populates="book")



class StoreOrder(Base):
    __tablename__ = "store_orders"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("store_books.id"), nullable=False)
    order_type = Column(SQLEnum(BookOrderType), default=BookOrderType.BORROW, nullable=False)
    order_date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=True)  # 6 months for borrow
    price_paid = Column(Float, default=0.0)
    status = Column(SQLEnum(BookOrderStatus), default=BookOrderStatus.APPROVED, nullable=False)
    remarks = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")
    book = relationship("StoreBook", back_populates="orders")


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, default="ACADEMIC")
    posted_by = Column(String, nullable=False)
    posted_date = Column(Date, default=date.today)



class HostelMovement(Base):
    __tablename__ = "hostel_movements"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=False)
    room_number = Column(String, nullable=True)
    block = Column(String, nullable=True)
    destination = Column(String, nullable=False)
    purpose = Column(String, nullable=True)
    checkout_time = Column(DateTime, default=datetime.utcnow)
    expected_return = Column(DateTime, nullable=True)
    checkin_time = Column(DateTime, nullable=True)
    status = Column(String, default="OUT")
    warden_name = Column(String, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class HostelMessMenu(Base):
    __tablename__ = "hostel_mess_menu"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(String, unique=True, index=True, nullable=False)
    breakfast = Column(Text, nullable=False)
    lunch = Column(Text, nullable=False)
    snacks = Column(Text, nullable=False)
    dinner = Column(Text, nullable=False)
    special_item = Column(String, nullable=True)
    timing_info = Column(String, default="Breakfast: 7:30-9:00 AM | Lunch: 12:30-2:00 PM | Snacks: 5:00-6:00 PM | Dinner: 7:30-9:30 PM")
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)



class ParentContact(Base):
    __tablename__ = "parent_contacts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=False)
    campus_name = Column(String, default="Trust One Institute of Technology")
    class_code = Column(String, default="Year 1 / Sec A")
    parent_name = Column(String, nullable=False)
    relationship_type = Column(String, default="FATHER")
    mobile_number = Column(String, nullable=False)
    mobile_number_masked = Column(String, nullable=False)
    is_primary_contact = Column(Boolean, default=True)
    mobile_number_verified = Column(Boolean, default=True)
    preferred_language = Column(String, default="en")
    contact_authorization_status = Column(String, default="AUTHORIZED")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    dlt_template_id = Column(String, nullable=False)
    content_pattern = Column(Text, nullable=False)
    sample_preview = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    is_dlt_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SmsNotification(Base):
    __tablename__ = "sms_notifications"

    id = Column(Integer, primary_key=True, index=True)
    notification_uuid = Column(String, unique=True, index=True, nullable=False)
    campus_name = Column(String, nullable=False)
    student_id = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=False)
    parent_contact_id = Column(Integer, nullable=True)
    parent_name = Column(String, nullable=True)
    parent_contact_no = Column(String, nullable=True)
    destination_number_masked = Column(String, nullable=False)
    teacher_username = Column(String, index=True, nullable=False)
    teacher_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    template_code = Column(String, nullable=True)
    message_body = Column(Text, nullable=False)
    provider_name = Column(String, default="SIMULATOR")
    provider_message_id = Column(String, nullable=True)
    status = Column(String, default="DELIVERED")  # QUEUED, SUBMITTED, DELIVERED, FAILED
    segments = Column(Integer, default=1)
    character_count = Column(Integer, default=0)
    failure_reason = Column(Text, nullable=True)
    idempotency_key = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)


class AttendanceNotificationEvent(Base):
    __tablename__ = "attendance_notification_events"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    event_date = Column(Date, index=True, nullable=False)
    notification_type = Column(String, default="ABSENCE")
    notification_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)



class HostelBlock(Base):
    __tablename__ = "hostel_blocks"

    block_number = Column(Integer, primary_key=True)
    block_name = Column(String, unique=True, nullable=False)
    hostel_type = Column(String, nullable=False)  # 'GIRLS', 'BOYS'
    display_name = Column(String, nullable=False)
    floors = Column(Integer, default=4)
    total_rooms = Column(Integer, nullable=False)
    total_capacity = Column(Integer, nullable=False)
    warden_in_charge = Column(String, nullable=True)
    warden_contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class HostelAllocation(Base):
    __tablename__ = "hostel_allocations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    student_name = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    course_stream = Column(String, nullable=True)
    year_class = Column(String, nullable=True)
    institution = Column(String, nullable=True)
    block_number = Column(Integer, ForeignKey("hostel_blocks.block_number"), nullable=False)
    block_name = Column(String, nullable=False)
    room_number = Column(String, nullable=False)
    bed_number = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")
    allocated_by = Column(String, default="SYSTEM_ADMIN")
    allocation_date = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class HostelAllocationAudit(Base):
    __tablename__ = "hostel_allocation_audit"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=False)
    gender = Column(String, nullable=True)
    action_type = Column(String, index=True, nullable=False)
    previous_block = Column(String, nullable=True)
    previous_room = Column(String, nullable=True)
    previous_bed = Column(String, nullable=True)
    new_block = Column(String, nullable=True)
    new_room = Column(String, nullable=True)
    new_bed = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    performed_by = Column(String, default="SYSTEM_ADMIN")
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminProfile(Base):
    __tablename__ = "admin_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    admin_id = Column(String(50), unique=True, index=True, nullable=False)
    admin_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    domain = Column(String(100), index=True, nullable=False)
    role = Column(String(100), nullable=False)
    access_scope = Column(String(100), nullable=False)
    account_status = Column(String(50), default="Active")
    phone = Column(String(50), nullable=True)
    preferred_language = Column(String(10), default="en")
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdmissionApplication(Base):
    __tablename__ = "admission_applications"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(50), unique=True, index=True, nullable=False)
    student_id = Column(String(50), nullable=True, index=True)
    student_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    contact_number = Column(String(50), nullable=False)
    parent_name = Column(String(255), nullable=True)
    parent_contact = Column(String(50), nullable=True)
    gender = Column(String(20), default="Male")
    date_of_birth = Column(Date, nullable=True)
    educational_domain = Column(String(100), index=True, nullable=False)
    course_or_class = Column(String(100), nullable=False)
    academic_year = Column(String(50), default="2026-2027")
    admission_category = Column(String(50), default="General")
    previous_qualification = Column(String(255), nullable=True)
    previous_percentage = Column(Float, nullable=True)
    application_date = Column(Date, default=date.today)
    application_status = Column(String(50), index=True, default="UNDER_REVIEW")
    document_verification_status = Column(String(50), default="PENDING")
    fee_status = Column(String(50), default="PENDING")
    fee_amount = Column(Float, default=0.0)
    assigned_admin_id = Column(String(50), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    correction_notes = Column(Text, nullable=True)
    declaration_accepted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdmissionDocument(Base):
    __tablename__ = "admission_documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(50), ForeignKey("admission_applications.application_id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(100), nullable=False)
    document_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=True)
    verification_status = Column(String(50), default="PENDING")
    verified_by = Column(String(50), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminNotification(Base):
    __tablename__ = "admin_notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_admin_id = Column(String(50), nullable=True, index=True)
    domain = Column(String(100), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(String(50), index=True, nullable=False)
    actor_name = Column(String(255), nullable=False)
    actor_email = Column(String(255), nullable=False)
    action = Column(String(100), index=True, nullable=False)
    affected_record_id = Column(String(100), nullable=True)
    domain = Column(String(100), index=True, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    outcome = Column(String(50), default="SUCCESS")
    created_at = Column(DateTime, default=datetime.utcnow)


class DataImportJob(Base):
    __tablename__ = "data_import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(50), unique=True, index=True, nullable=False)
    import_type = Column(String(50), nullable=False)
    filename = Column(String(255), nullable=False)
    domain = Column(String(100), nullable=True)
    imported_by = Column(String(255), nullable=False)
    total_rows = Column(Integer, default=0)
    successful_rows = Column(Integer, default=0)
    rejected_rows = Column(Integer, default=0)
    skipped_rows = Column(Integer, default=0)
    error_report = Column(JSON, nullable=True)
    status = Column(String(50), default="COMPLETED")
    created_at = Column(DateTime, default=datetime.utcnow)
