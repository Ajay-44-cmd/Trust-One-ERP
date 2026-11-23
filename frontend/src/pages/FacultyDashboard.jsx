import React, { useEffect, useState } from 'react';
import PageContainer from '../components/layout/PageContainer';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getFacultyDashboard, getFacultyAssignedStudents } from '../services/erpService';
import { User, BookOpen, Users, Upload, CheckSquare, Edit3, ArrowUpRight, Send, Search, CheckCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getFacultyDashboard(),
      getFacultyAssignedStudents().catch(() => ({ total_assigned: 0, students: [] }))
    ])
      .then(([dashData, studentsData]) => {
        setData(dashData);
        setAssignedStudents(studentsData.students || []);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load faculty portal data.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageContainer><LoadingSpinner message="Loading faculty portal..." /></PageContainer>;

  if (error || !data) {
    return (
      <PageContainer>
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex flex-col items-start space-y-3">
          <p className="font-bold">{error || 'Unable to load faculty dashboard.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
          >
            Retry Loading
          </button>
        </div>
      </PageContainer>
    );
  }

  const filteredStudents = assignedStudents.filter((st) => {
    if (!studentSearch.trim()) return true;
    const term = studentSearch.toLowerCase();
    return (
      st.student_name?.toLowerCase().includes(term) ||
      st.student_id?.toLowerCase().includes(term) ||
      st.class_code?.toLowerCase().includes(term) ||
      st.parent_name?.toLowerCase().includes(term)
    );
  });

  return (
    <PageContainer>
      {/* Faculty Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-2 bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-medium text-indigo-200">
                <span>Employee ID: {data?.employee_id || 'FAC-N/A'}</span>
              </div>
              {data?.subject_name && (
                <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-300">
                  <span>Assigned Subject: {data.subject_name} ({data.subject_code})</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {data?.faculty_name || 'Faculty Member'}!</h1>
            <p className="text-sm text-indigo-200/80">
              <span className="font-semibold text-white">{data?.designation || 'Faculty'}</span> &bull; {data?.department || 'Department of Engineering'}
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-indigo-200 font-semibold">Assigned Students</p>
              <p className="text-2xl font-black text-emerald-300">{data?.total_students || assignedStudents.length || 30}</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-indigo-200 font-semibold">Assigned Subjects</p>
              <p className="text-2xl font-black text-white">{data?.assigned_subjects?.length || 1}</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-indigo-200 font-semibold">Materials Uploaded</p>
              <p className="text-2xl font-black text-white">{data?.total_materials_uploaded || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Class Traversal Workspace" icon={Users} subtitle="Select class, view roster, attendance & marks">
          <Link
            to="/faculty/classes"
            className="mt-4 inline-flex items-center justify-between w-full p-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <span>Traverse Classes & Roster</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>

        <Card title="Mark Attendance" icon={CheckSquare} subtitle="Record class presence for enrolled students">
          <Link
            to="/faculty/attendance"
            className="mt-4 inline-flex items-center justify-between w-full p-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <span>Open Attendance Sheet</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>

        <Card title="Enter Sessional Marks" icon={Edit3} subtitle="Record Sessional 1, Sessional 2 & lab scores">
          <Link
            to="/faculty/marks"
            className="mt-4 inline-flex items-center justify-between w-full p-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <span>Enter Sessional Scores</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>

        <Card title="Teacher-to-Parent SMS" icon={Send} subtitle="DLT-compliant SMS to parent contacts">
          <p className="text-xs text-gray-500 mt-2">Anti-duplication active. Real-time delivery status.</p>
          <Link
            to="/faculty/parent-sms"
            className="mt-3 inline-flex items-center justify-between w-full p-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <span>Open SMS Communication</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>

      {/* Assigned Subjects Overview */}
      <Card title="My Assigned Subjects & Courses" icon={BookOpen}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.assigned_subjects?.map((sub) => (
            <div key={sub.id} className={`p-4 rounded-2xl space-y-2 border ${sub.is_primary ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-mono font-bold text-[10px] rounded">
                  {sub.code}
                </span>
                {sub.is_primary && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-200/60 px-2 py-0.5 rounded-full">
                    Primary Faculty
                  </span>
                )}
              </div>
              <p className="font-bold text-slate-900 text-sm">{sub.name}</p>
              <p className="text-xs text-slate-500 font-medium">{sub.credits} Academic Credits</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Assigned Students (30 Members) Table */}
      <Card
        title={`My Assigned Students (${assignedStudents.length || 30} Members)`}
        icon={Users}
        subtitle="30 dedicated students assigned to your class and subject roster"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by student ID, name, parent..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Showing {filteredStudents.length} of {assignedStudents.length || 30} students
              </span>
              <Link
                to="/faculty/parent-sms"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Message Parents</span>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Assigned Class</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Academic Score</th>
                  <th className="py-3 px-4">Parent / Guardian</th>
                  <th className="py-3 px-4">Parent Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((st, idx) => (
                    <tr key={st.student_id || idx} className="hover:bg-indigo-50/40 transition">
                      <td className="py-2.5 px-4 font-mono text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">{st.student_id}</td>
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{st.student_name}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono font-bold text-[10px]">
                          {st.class_code} (Sec {st.section})
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                          {st.attendance_pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-700">
                        {st.academic_pct}%
                      </td>
                      <td className="py-2.5 px-4 text-gray-700">{st.parent_name}</td>
                      <td className="py-2.5 px-4 font-mono text-gray-500">{st.parent_mobile_masked}</td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          to="/faculty/parent-sms"
                          className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-bold text-[11px]"
                        >
                          <span>SMS</span>
                          <Send className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-gray-400">
                      No students found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
