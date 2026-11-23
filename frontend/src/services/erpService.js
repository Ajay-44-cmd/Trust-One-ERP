import api from './api';

// Student & Common ERP Services
export const getDashboardSummary = () => api.get('/dashboard').then(res => res.data);
export const getStudentProfile = () => api.get('/students/me').then(res => res.data);

export const getStudentSemesters = () => api.get('/attendance/semesters').then(res => res.data);
export const getAttendanceSummary = (semester) => api.get('/attendance/summary', { params: { semester } }).then(res => res.data);
export const getDayWiseAttendance = (semester) => api.get('/attendance/day-wise', { params: { semester } }).then(res => res.data);
export const calculateAttendance = (data) => api.post('/attendance/calculate', data).then(res => res.data);

export const getRegistrationHistory = () => api.get('/registration').then(res => res.data);

export const getNocApplications = () => api.get('/noc').then(res => res.data);
export const submitNocApplication = (data) => api.post('/noc', data).then(res => res.data);

export const getFeeRecords = () => api.get('/fees').then(res => res.data);
export const downloadFeeReceipt = (feeId) => api.get(`/fees/${feeId}/receipt`, { responseType: 'blob' }).then(res => res.data);

export const getSessionalMarks = () => api.get('/marks').then(res => res.data);

export const getLibraryRecords = () => api.get('/library').then(res => res.data);

export const getMessages = () => api.get('/messages').then(res => res.data);
export const getMessageRecipients = () => api.get('/messages/recipients').then(res => res.data);
export const sendMessage = (data) => api.post('/messages', data).then(res => res.data);

export const getPlacementDrives = () => api.get('/placements').then(res => res.data);
export const updatePlacementProfile = (data) => api.patch('/placements/profile', data).then(res => res.data);

export const getForumPosts = () => api.get('/forum').then(res => res.data);
export const createForumPost = (data) => api.post('/forum', data).then(res => res.data);

export const getTimetable = () => api.get('/timetable').then(res => res.data);

export const getAcademicMaterials = (params = {}) => api.get('/academic-materials', { params }).then(res => res.data);

// Campus Book Store & E-Library Services
export const getBookStoreCatalog = (params = {}) => api.get('/bookstore/books', { params }).then(res => res.data);
export const getBookDetail = (bookId) => api.get(`/bookstore/books/${bookId}`).then(res => res.data);
export const placeBookOrder = (data) => api.post('/bookstore/orders', data).then(res => res.data);
export const getMyBookOrders = () => api.get('/bookstore/orders/my-orders').then(res => res.data);


// Faculty Portal Services
export const getFacultyDashboard = () => api.get('/faculty-portal/dashboard').then(res => res.data);
export const getFacultyClasses = () => api.get('/faculty-portal/classes').then(res => res.data);
export const getFacultyAssignedStudents = () => api.get('/faculty-portal/assigned-students').then(res => res.data);
export const getEnrolledStudents = (params) => api.get('/faculty-portal/students', { params }).then(res => res.data);
export const markStudentAttendance = (data) => api.post('/faculty-portal/attendance', data).then(res => res.data);
export const submitStudentMarks = (data) => api.post('/faculty-portal/marks', data).then(res => res.data);
export const submitBulkStudentMarks = (data) => api.post('/faculty-portal/marks/bulk', data).then(res => res.data);
export const uploadStudyMaterial = (data) => api.post('/faculty-portal/materials', data).then(res => res.data);
export const uploadMaterialFile = (formData) => api.post('/faculty-portal/materials/upload-file', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(res => res.data);

// Admin Portal & Notices Services
export const getAdminDashboard = () => api.get('/admin-portal/dashboard').then(res => res.data);
export const getNotices = () => api.get('/admin-portal/notices').then(res => res.data);
export const deleteNotice = (id) => api.delete(`/admin-portal/notices/${id}`).then(res => res.data);
export const getDetailedNocApplications = () => api.get('/admin-portal/noc-applications').then(res => res.data);
export const reviewNocApplication = (id, data) => api.patch(`/admin-portal/noc/${id}`, data).then(res => res.data);
export const postNotice = (data) => api.post('/admin-portal/notices', data).then(res => res.data);
export const getAllPlacementDrives = () => api.get('/admin-portal/placements/all').then(res => res.data);
export const publishPlacementDrive = (data) => api.post('/admin-portal/placements', data).then(res => res.data);
export const deletePlacementDrive = (id) => api.delete(`/admin-portal/placements/${id}`).then(res => res.data);
export const resetAttendanceCycle = (data) => api.post('/admin-portal/attendance/reset', data).then(res => res.data);


// Warden Portal Services
export const getWardenOverview = () => api.get('/warden/overview').then(res => res.data);
export const getHostelResidents = (params) => api.get('/warden/residents', { params }).then(res => res.data);
export const getHostelMovements = () => api.get('/warden/movements').then(res => res.data);
export const recordStudentCheckout = (data) => api.post('/warden/checkout', data).then(res => res.data);
export const recordStudentCheckin = (movementId) => api.post(`/warden/checkin/${movementId}`).then(res => res.data);
export const getMessMenu = () => api.get('/warden/mess-menu').then(res => res.data);
export const updateMessMenu = (dayOfWeek, data) => api.put(`/warden/mess-menu/${dayOfWeek}`, data).then(res => res.data);
export const getHostelAllocationEligibility = (studentId) => api.get(`/warden/allocation-eligibility/${studentId}`).then(res => res.data);
export const getRoomAvailability = (params) => api.get('/warden/room-availability', { params }).then(res => res.data);
export const allocateHostelBed = (data) => api.post('/warden/allocate', data).then(res => res.data);
export const getHostelAuditLog = (params = {}) => api.get('/warden/audit-log', { params }).then(res => res.data);


// Teacher-to-Parent SMS Communication Services
export const getParentSmsOverview = () => api.get('/parent-sms/overview').then(res => res.data);
export const getParentSmsClasses = () => api.get('/parent-sms/classes').then(res => res.data);
export const getParentSmsStudents = (params = {}) => api.get('/parent-sms/students', { params }).then(res => res.data);
export const getParentSmsTemplates = () => api.get('/parent-sms/templates').then(res => res.data);
export const previewParentSms = (data) => api.post('/parent-sms/preview', data).then(res => res.data);
export const sendParentSms = (data) => api.post('/parent-sms/send', data).then(res => res.data);
export const getParentSmsHistory = (params = {}) => api.get('/parent-sms/history', { params }).then(res => res.data);
export const retryParentSms = (notificationId) => api.post(`/parent-sms/retry/${notificationId}`).then(res => res.data);
export const updateParentContact = (data) => api.post('/parent-sms/update-parent-contact', data).then(res => res.data);

// Trust One 6-Domain Admin Portal Services
export const getTrustAdminOverview = (domainFilter) =>
  api.get('/admin-portal/overview', { params: domainFilter ? { domain_filter: domainFilter } : {} }).then(res => res.data);

export const getAdminAdmissions = (params = {}) =>
  api.get('/admin-portal/admissions', { params }).then(res => res.data);

export const createAdminAdmission = (data) =>
  api.post('/admin-portal/admissions', data).then(res => res.data);

export const getAdminAdmissionDetail = (id) =>
  api.get(`/admin-portal/admissions/${id}`).then(res => res.data);

export const updateAdminAdmissionStatus = (id, data) =>
  api.patch(`/admin-portal/admissions/${id}/status`, data).then(res => res.data);

export const verifyAdminAdmissionDoc = (id, data) =>
  api.post(`/admin-portal/admissions/${id}/verify-document`, data).then(res => res.data);

export const getAdminStudents = (params = {}) =>
  api.get('/admin-portal/students', { params }).then(res => res.data);

export const updateAdminStudent = (id, data) =>
  api.patch(`/admin-portal/students/${id}`, data).then(res => res.data);

export const transferAdminStudent = (id, data) =>
  api.post(`/admin-portal/students/${id}/transfer`, data).then(res => res.data);

export const importAdminData = (formData) =>
  api.post('/admin-portal/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data);

export const getAdminReports = (params = {}) =>
  api.get('/admin-portal/reports', { params }).then(res => res.data);

export const getAdminNotifications = () =>
  api.get('/admin-portal/notifications').then(res => res.data);

export const markAdminNotificationRead = (id) =>
  api.patch(`/admin-portal/notifications/${id}/read`).then(res => res.data);

export const getAdminAuditLogs = (params = {}) =>
  api.get('/admin-portal/audit-logs', { params }).then(res => res.data);

export const getAdminProfile = () =>
  api.get('/admin-portal/profile').then(res => res.data);

export const updateAdminProfile = (data) =>
  api.patch('/admin-portal/profile', data).then(res => res.data);
