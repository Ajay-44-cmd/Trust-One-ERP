import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Send, Users, CheckCircle, XCircle, Clock,
  AlertCircle, RefreshCw, Phone, Filter, Search, Eye, ChevronDown,
  ChevronRight, BarChart2, Bell, BookOpen, Calendar, ClipboardList,
  UserCheck, Megaphone, RotateCcw, Info, Shield, Zap, TrendingUp
} from 'lucide-react';
import {
  getParentSmsOverview, getParentSmsClasses, getParentSmsStudents,
  getParentSmsTemplates, previewParentSms, sendParentSms,
  getParentSmsHistory, retryParentSms
} from '../services/erpService';

const CATEGORY_ICONS = {
  'Examination Schedule': Calendar,
  'Class Timetable': ClipboardList,
  'Examination Marks': BookOpen,
  'Attendance Summary': BarChart2,
  'Absence Notification': Bell,
  'Academic Reminder': AlertCircle,
  'General Class Announcement': Megaphone,
};

const STATUS_BADGE = {
  DELIVERED: 'bg-green-100 text-green-700 border border-green-200',
  SUBMITTED: 'bg-blue-100 text-blue-700 border border-blue-200',
  QUEUED: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  FAILED: 'bg-red-100 text-red-700 border border-red-200',
  SKIPPED_DUPLICATE: 'bg-gray-100 text-gray-600 border border-gray-200',
};

export default function FacultyParentSms() {
  // Section state
  const [activeSection, setActiveSection] = useState('overview');

  // Data state
  const [overview, setOverview] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Selection state
  const [recipientType, setRecipientType] = useState('INDIVIDUAL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customValues, setCustomValues] = useState({});
  const [preview, setPreview] = useState(null);

  // Filter state
  const [studentSearch, setStudentSearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState({ category: '', status: '', search: '' });
  const [historyPage, setHistoryPage] = useState(1);

  // UI state
  const [loading, setLoading] = useState({});
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Loaders
  const loadOverview = useCallback(async () => {
    setLoading(l => ({ ...l, overview: true }));
    try {
      const data = await getParentSmsOverview();
      setOverview(data);
    } catch (e) {
      showToast('Failed to load overview', 'error');
    } finally {
      setLoading(l => ({ ...l, overview: false }));
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const data = await getParentSmsClasses();
      setClasses(data.classes || []);
    } catch (e) {}
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await getParentSmsTemplates();
      setTemplates(data);
    } catch (e) {}
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(l => ({ ...l, students: true }));
    try {
      const params = { limit: 50 };
      if (selectedClass && selectedClass !== 'ALL') params.class_code = selectedClass;
      if (studentSearch.trim()) params.search = studentSearch.trim();
      const data = await getParentSmsStudents(params);
      setStudents(data.items || []);
      setStudentsTotal(data.total || 0);
    } catch (e) {
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(l => ({ ...l, students: false }));
    }
  }, [selectedClass, studentSearch]);

  const loadHistory = useCallback(async () => {
    setLoading(l => ({ ...l, history: true }));
    try {
      const params = { page: historyPage, page_size: 20 };
      if (historyFilter.category) params.category = historyFilter.category;
      if (historyFilter.status) params.status = historyFilter.status;
      if (historyFilter.search) params.search = historyFilter.search;
      const data = await getParentSmsHistory(params);
      setHistory(data.records || []);
      setHistoryTotal(data.total || 0);
    } catch (e) {
      showToast('Failed to load message history', 'error');
    } finally {
      setLoading(l => ({ ...l, history: false }));
    }
  }, [historyPage, historyFilter]);

  useEffect(() => { loadOverview(); loadClasses(); loadTemplates(); }, []);
  useEffect(() => { if (activeSection === 'students') loadStudents(); }, [activeSection, selectedClass, studentSearch]);
  useEffect(() => { if (activeSection === 'history') loadHistory(); }, [activeSection, historyPage, historyFilter]);

  // Preview
  const handlePreview = async () => {
    if (!selectedTemplate) { showToast('Select a message template first', 'error'); return; }
    const targetStudentId = selectedStudents[0] || students[0]?.student_id;
    if (!targetStudentId) { showToast('Select at least one student to preview', 'error'); return; }
    setPreviewLoading(true);
    setPreview(null);
    try {
      const data = await previewParentSms({
        student_id: targetStudentId,
        template_code: selectedTemplate.template_code,
        custom_values: customValues
      });
      setPreview(data);
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Failed to generate preview', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Send
  const handleSend = async () => {
    if (!selectedTemplate) { showToast('Select a template before sending', 'error'); return; }
    if (recipientType === 'INDIVIDUAL' && selectedStudents.length === 0) {
      showToast('Select at least one student recipient', 'error'); return;
    }
    if (recipientType === 'CLASS' && (!selectedClass || selectedClass === 'ALL')) {
      showToast('Select a class to send to all students', 'error'); return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const payload = {
        recipient_type: recipientType,
        template_code: selectedTemplate.template_code,
        custom_values: customValues
      };
      if (recipientType === 'CLASS') payload.class_code = selectedClass;
      else payload.student_ids = selectedStudents;
      const data = await sendParentSms(payload);
      setSendResult(data);
      showToast(`${data.sent_count} message(s) sent successfully!`, 'success');
      loadOverview();
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Failed to send messages', 'error');
    } finally {
      setSending(false);
    }
  };

  // Retry
  const handleRetry = async (notifId) => {
    try {
      const data = await retryParentSms(notifId);
      showToast(data.success ? 'Message retried successfully' : data.error, data.success ? 'success' : 'error');
      loadHistory();
    } catch (e) {
      showToast('Failed to retry message', 'error');
    }
  };

  const toggleStudentSelect = (sid) => {
    setSelectedStudents(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
    );
  };

  const selectAllVisible = () => {
    const allIds = students.map(s => s.student_id);
    setSelectedStudents(prev => {
      const allSelected = allIds.every(id => prev.includes(id));
      return allSelected ? prev.filter(id => !allIds.includes(id)) : [...new Set([...prev, ...allIds])];
    });
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'students', label: 'Select Recipients', icon: Users },
    { id: 'compose', label: 'Compose & Send', icon: Send },
    { id: 'history', label: 'Message History', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <MessageSquare size={24} className="text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Parent Communication</h1>
              <p className="text-xs text-blue-300 font-medium mt-0.5">
                One Trust. Every Campus. Connected.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {overview && (
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-gray-300">{overview.teacher_name}</span>
                <span className="w-px h-4 bg-white/20" />
                <span className="text-blue-300">{overview.department}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 rounded-lg px-3 py-1.5 text-xs text-green-300">
              <Shield size={12} />
              <span>DLT Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Nav */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all ${
                  activeSection === id
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                {label}
                {id === 'students' && selectedStudents.length > 0 && (
                  <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">
                    {selectedStudents.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ─────────────── SECTION: OVERVIEW ─────────────── */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {loading.overview ? (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <RefreshCw className="animate-spin mr-3" size={20} /> Loading overview...
              </div>
            ) : overview ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Sent', value: overview.total_sent, icon: Send, color: 'blue', sub: 'All time messages' },
                    { label: 'Delivered', value: overview.delivered, icon: CheckCircle, color: 'green', sub: `${overview.delivery_rate}% delivery rate` },
                    { label: 'Pending', value: overview.pending, icon: Clock, color: 'yellow', sub: 'Queued / Submitted' },
                    { label: 'Failed', value: overview.failed, icon: XCircle, color: 'red', sub: 'Retry available' },
                  ].map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                        <div className={`p-2 rounded-lg bg-${color}-50`}>
                          <Icon size={16} className={`text-${color}-500`} />
                        </div>
                      </div>
                      <div className={`text-3xl font-bold text-${color}-600 mb-1`}>{value}</div>
                      <div className="text-xs text-gray-400">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <TrendingUp size={18} className="text-blue-500" />
                      <span className="font-semibold text-gray-700">Delivery Rate</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
                        style={{ width: `${overview.delivery_rate}%` }}
                      />
                    </div>
                    <span className="text-2xl font-bold text-green-600">{overview.delivery_rate}%</span>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Users size={18} className="text-purple-500" />
                      <span className="font-semibold text-gray-700">Assigned Students</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-600">{overview.total_assigned_students?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400 mt-1">Across all authorized classes</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Phone size={18} className="text-orange-500" />
                      <span className="font-semibold text-gray-700">Missing Contacts</span>
                    </div>
                    <div className={`text-3xl font-bold ${overview.missing_contacts_count > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                      {overview.missing_contacts_count}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {overview.missing_contacts_count > 0 ? 'Needs attention' : 'All contacts verified'}
                    </div>
                  </div>
                </div>

                {/* Recent Notifications */}
                {overview.recent_notifications?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Bell size={16} className="text-blue-500" />
                        Recent Notifications
                      </h3>
                      <button
                        onClick={() => setActiveSection('history')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {overview.recent_notifications.map(n => {
                        const CatIcon = CATEGORY_ICONS[n.category] || MessageSquare;
                        return (
                          <div key={n.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50">
                            <div className="p-2 bg-blue-50 rounded-lg mt-0.5 flex-shrink-0">
                              <CatIcon size={14} className="text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-gray-800 truncate">{n.student_name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[n.status]}`}>{n.status}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 truncate">{n.category} · {n.destination_number_masked}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{n.created_at}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Action */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Ready to communicate?</h3>
                    <p className="text-blue-200 text-sm">Select recipients and send DLT-compliant messages to parents instantly.</p>
                  </div>
                  <button
                    onClick={() => setActiveSection('students')}
                    className="bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-all flex-shrink-0"
                  >
                    Get Started →
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ─────────────── SECTION: SELECT RECIPIENTS ─────────────── */}
        {activeSection === 'students' && (
          <div className="space-y-4">
            {/* Recipient Type Tabs */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <UserCheck size={18} className="text-blue-500" />
                <span className="font-semibold text-gray-800">Recipient Selection</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {[
                  { id: 'INDIVIDUAL', label: 'Individual Students', desc: 'Select specific students' },
                  { id: 'CLASS', label: 'Entire Class', desc: 'All students in a class' },
                  { id: 'SELECTED_STUDENTS', label: 'Custom Selection', desc: 'Mixed student list' },
                ].map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => { setRecipientType(id); setSelectedStudents([]); }}
                    className={`flex-1 min-w-[160px] p-3 rounded-xl border-2 text-left transition-all ${
                      recipientType === id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs mt-0.5 opacity-70">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search students, parent names..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-gray-700 min-w-[220px]"
              >
                <option value="ALL">All Classes</option>
                {classes.slice(0, 50).map(c => (
                  <option key={c.class_code} value={c.class_code}>
                    {c.class_code} ({c.student_count} students)
                  </option>
                ))}
              </select>
              <button onClick={loadStudents} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Selection Summary */}
            {(selectedStudents.length > 0 || recipientType === 'CLASS') && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">
                    {recipientType === 'CLASS'
                      ? `Will send to all students in: ${selectedClass === 'ALL' ? 'ALL CLASSES (caution!)' : selectedClass}`
                      : `${selectedStudents.length} student(s) selected`
                    }
                  </span>
                </div>
                <button
                  onClick={() => setActiveSection('compose')}
                  className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
                >
                  Compose Message →
                </button>
              </div>
            )}

            {/* Student Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-sm">
                  {loading.students ? 'Loading...' : `${studentsTotal.toLocaleString()} students total`}
                </span>
                <button
                  onClick={selectAllVisible}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  {students.every(s => selectedStudents.includes(s.student_id)) ? 'Deselect All Visible' : 'Select All Visible'}
                </button>
              </div>
              {loading.students ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <RefreshCw className="animate-spin mr-2" size={18} /> Loading students...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left w-10">
                          <input type="checkbox" className="rounded" onChange={selectAllVisible}
                            checked={students.length > 0 && students.every(s => selectedStudents.includes(s.student_id))}
                          />
                        </th>
                        <th className="px-4 py-3 text-left">Student</th>
                        <th className="px-4 py-3 text-left">Class</th>
                        <th className="px-4 py-3 text-left">Parent / Contact</th>
                        <th className="px-4 py-3 text-left">Attendance</th>
                        <th className="px-4 py-3 text-left">Contact Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map(s => (
                        <tr
                          key={s.student_id}
                          onClick={() => toggleStudentSelect(s.student_id)}
                          className={`cursor-pointer transition-colors ${
                            selectedStudents.includes(s.student_id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedStudents.includes(s.student_id)}
                              onChange={() => toggleStudentSelect(s.student_id)}
                              onClick={e => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-800">{s.student_name}</div>
                            <div className="text-xs text-gray-400">{s.student_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{s.class_code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-700">{s.parent_name}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone size={10} /> {s.mobile_number_masked}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${s.attendance_pct >= 75 ? 'text-green-600' : 'text-red-500'}`}>
                              {s.attendance_pct?.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              s.contact_authorization_status === 'AUTHORIZED'
                                ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {s.mobile_number_verified ? '✓ Verified' : '⚠ Unverified'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length === 0 && (
                    <div className="text-center py-10 text-gray-400">No students found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── SECTION: COMPOSE & SEND ─────────────── */}
        {activeSection === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Template & Config */}
            <div className="space-y-4">
              {/* Template Selection */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MessageSquare size={16} className="text-blue-500" />
                  Select Message Template
                </h3>
                <div className="space-y-2">
                  {templates.map(t => {
                    const Icon = CATEGORY_ICONS[t.category] || MessageSquare;
                    return (
                      <button
                        key={t.template_code}
                        onClick={() => { setSelectedTemplate(t); setPreview(null); }}
                        className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                          selectedTemplate?.template_code === t.template_code
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${selectedTemplate?.template_code === t.template_code ? 'bg-blue-100' : 'bg-white'}`}>
                            <Icon size={16} className={selectedTemplate?.template_code === t.template_code ? 'text-blue-600' : 'text-gray-500'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-800">{t.category}</div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">{t.title}</div>
                            <div className="text-xs text-gray-400 mt-1">DLT: {t.dlt_template_id}</div>
                          </div>
                          {selectedTemplate?.template_code === t.template_code && (
                            <CheckCircle size={16} className="text-blue-600 flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Fields for selected template */}
              {selectedTemplate && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Info size={16} className="text-blue-500" />
                    Customize Placeholders (Optional)
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">Leave blank to use auto-populated values from student records.</p>
                  {['exam_name', 'subject_name', 'marks_obtained', 'max_marks', 'reminder_type', 'due_date', 'announcement_title'].map(key => (
                    selectedTemplate.content_pattern.includes(`{${key}}`) && (
                      <div key={key} className="mb-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1 capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        <input
                          value={customValues[key] || ''}
                          onChange={e => setCustomValues(v => ({ ...v, [key]: e.target.value }))}
                          placeholder={`Auto from records`}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Recipient Summary */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users size={16} className="text-blue-500" />
                  Recipients
                </h3>
                <div className="text-sm text-gray-600">
                  {recipientType === 'CLASS' ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg font-semibold">{selectedClass}</span>
                      <span className="text-gray-500">— All students in this class</span>
                    </div>
                  ) : selectedStudents.length > 0 ? (
                    <div>
                      <div className="font-semibold text-blue-700 mb-2">{selectedStudents.length} student(s) selected</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedStudents.slice(0, 10).map(sid => (
                          <span key={sid} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md">{sid}</span>
                        ))}
                        {selectedStudents.length > 10 && (
                          <span className="text-xs text-gray-400">+{selectedStudents.length - 10} more</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-orange-500 flex items-center gap-2">
                      <AlertCircle size={14} />
                      No recipients selected. Go to "Select Recipients" tab.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Preview + Send */}
            <div className="space-y-4">
              {/* Preview Box */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Eye size={16} className="text-blue-500" />
                    Message Preview
                  </h3>
                  <button
                    onClick={handlePreview}
                    disabled={!selectedTemplate || previewLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all"
                  >
                    {previewLoading ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
                    {previewLoading ? 'Generating...' : 'Preview'}
                  </button>
                </div>

                {preview ? (
                  <div className="space-y-3">
                    {/* Recipient info */}
                    <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Student</span>
                        <span className="font-semibold text-gray-800">{preview.student_name} ({preview.student_id})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Parent</span>
                        <span className="font-semibold text-gray-800">{preview.parent_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Masked Number</span>
                        <span className="font-semibold text-blue-700 flex items-center gap-1">
                          <Phone size={10} /> {preview.destination_number_masked}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Auth Status</span>
                        <span className={`font-semibold ${preview.contact_authorization_status === 'AUTHORIZED' ? 'text-green-600' : 'text-red-500'}`}>
                          {preview.contact_authorization_status}
                        </span>
                      </div>
                    </div>

                    {/* Message bubble */}
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs font-semibold text-green-700">SMS Preview</span>
                        <span className="text-xs text-green-600 ml-auto">{preview.metrics?.encoding}</span>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {preview.message_body}
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Characters', value: preview.metrics?.char_count },
                        { label: 'Segments', value: preview.metrics?.segments },
                        { label: 'Remaining', value: preview.metrics?.remaining_in_segment },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                          <div className="text-lg font-bold text-gray-800">{value}</div>
                          <div className="text-xs text-gray-500">{label}</div>
                        </div>
                      ))}
                    </div>

                    {preview.metrics?.segments > 1 && (
                      <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                        <Info size={14} className="flex-shrink-0 mt-0.5" />
                        This message spans {preview.metrics.segments} SMS segments. Each segment is billed separately by the carrier.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Eye size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a template and click Preview<br />to see the final message</p>
                  </div>
                )}
              </div>

              {/* SEND Button */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-800">
                  <Shield size={14} className="flex-shrink-0 mt-0.5" />
                  <span>All messages are DLT-compliant and logged. Parent numbers are masked in the UI. Duplicate absence alerts are automatically prevented.</span>
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !selectedTemplate || (recipientType !== 'CLASS' && selectedStudents.length === 0)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-base shadow-lg"
                >
                  {sending ? (
                    <><RefreshCw size={18} className="animate-spin" /> Sending...</>
                  ) : (
                    <><Send size={18} /> Send SMS to Parents</>
                  )}
                </button>
              </div>

              {/* Send Result */}
              {sendResult && (
                <div className={`rounded-xl border p-5 ${sendResult.failed_count === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={18} className="text-green-600" />
                    <span className="font-semibold text-green-800">Broadcast Complete</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div className="bg-white rounded-lg p-2.5 border border-green-200">
                      <div className="text-xl font-bold text-green-600">{sendResult.sent_count}</div>
                      <div className="text-xs text-gray-500">Sent</div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-red-200">
                      <div className="text-xl font-bold text-red-500">{sendResult.failed_count}</div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                      <div className="text-xl font-bold text-gray-500">{sendResult.duplicate_skipped_count}</div>
                      <div className="text-xs text-gray-500">Duplicates Skipped</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{sendResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── SECTION: HISTORY ─────────────── */}
        {activeSection === 'history' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={historyFilter.search}
                  onChange={e => setHistoryFilter(f => ({ ...f, search: e.target.value }))}
                  placeholder="Search by name, ID, message..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <select
                value={historyFilter.category}
                onChange={e => setHistoryFilter(f => ({ ...f, category: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 min-w-[190px]"
              >
                <option value="">All Categories</option>
                {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={historyFilter.status}
                onChange={e => setHistoryFilter(f => ({ ...f, status: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
              >
                <option value="">All Statuses</option>
                <option value="DELIVERED">Delivered</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="QUEUED">Queued</option>
                <option value="FAILED">Failed</option>
              </select>
              <button onClick={loadHistory} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                <Filter size={14} /> Filter
              </button>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <span className="font-semibold text-gray-700 text-sm">
                  {loading.history ? 'Loading...' : `${historyTotal} message records`}
                </span>
              </div>
              {loading.history ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <RefreshCw className="animate-spin mr-2" size={18} /> Loading history...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Date & Time</th>
                        <th className="px-4 py-3 text-left">Student / Parent</th>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-left">Masked Number</th>
                        <th className="px-4 py-3 text-left">Segments</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {history.map(r => {
                        const CatIcon = CATEGORY_ICONS[r.category] || MessageSquare;
                        return (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{r.created_at}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-800 text-sm">{r.student_name}</div>
                              <div className="text-xs text-gray-400">{r.student_id} · {r.parent_name}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <CatIcon size={13} className="text-blue-500 flex-shrink-0" />
                                <span className="text-xs text-gray-600">{r.category}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 font-mono">{r.destination_number_masked}</td>
                            <td className="px-4 py-3 text-xs text-center">
                              <span className={`px-2 py-0.5 rounded-md font-semibold ${r.segments > 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                {r.segments}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_BADGE[r.status] || ''}`}>
                                {r.status}
                              </span>
                              {r.failure_reason && (
                                <div className="text-xs text-red-500 mt-0.5 max-w-[150px] truncate" title={r.failure_reason}>
                                  {r.failure_reason}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {r.status === 'FAILED' && (
                                <button
                                  onClick={() => handleRetry(r.id)}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg"
                                >
                                  <RotateCcw size={11} /> Retry
                                </button>
                              )}
                              {r.status === 'DELIVERED' && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle size={11} /> Done
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {history.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                      <p>No message records found</p>
                    </div>
                  )}
                </div>
              )}
              {/* Pagination */}
              {historyTotal > 20 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Page {historyPage} of {Math.ceil(historyTotal / 20)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={historyPage >= Math.ceil(historyTotal / 20)}
                      onClick={() => setHistoryPage(p => p + 1)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

