import React, { useEffect, useState } from 'react';
import PageContainer from '../components/layout/PageContainer';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import {
  getTrustAdminOverview,
  getAdminAdmissions,
  createAdminAdmission,
  getAdminAdmissionDetail,
  updateAdminAdmissionStatus,
  verifyAdminAdmissionDoc,
  getAdminStudents,
  updateAdminStudent,
  transferAdminStudent,
  importAdminData,
  getAdminReports,
  getAdminNotifications,
  markAdminNotificationRead,
  getAdminAuditLogs,
  getAdminProfile,
  updateAdminProfile,
  resetAttendanceCycle
} from '../services/erpService';
import {
  ShieldCheck,
  Users,
  FileText,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
  Search,
  Download,
  Plus,
  UploadCloud,
  BarChart3,
  History,
  Bell,
  Settings,
  Eye,
  ArrowRightLeft,
  ChevronRight,
  Globe,
  RotateCcw,
  Check,
  X,
  FileCheck,
  UserCheck,
  Calendar,
  Layers,
  ChevronDown,
  Sparkles
} from 'lucide-react';

const DOMAIN_OPTIONS = [
  'Polytechnic',
  'School',
  'PU College',
  'MCA',
  'Medical College',
  'Engineering College'
];

// Bilingual translations (English & Kannada)
const TRANSLATIONS = {
  en: {
    title: 'Trust One ERP — Admin Dashboard',
    subtitle: 'Autonomous Domain Governance, Admissions Engine & Academic Administration',
    tagline: 'One Trust. Every Campus. Connected.',
    scopeNotice: 'Domain Scoped: Your administrative authority is strictly assigned to',
    allDomainsNotice: 'Trust Super Administrator: Central access across all 6 Trust One domains.',
    tabOverview: 'Executive Overview',
    tabAdmissions: 'Admissions Engine',
    tabStudents: 'Student Directory',
    tabImport: 'Data Import (CSV)',
    tabReports: 'Reports & Analytics',
    tabAudit: 'Audit Trail',
    tabNotifications: 'Notifications',
    tabSettings: 'Profile & Settings',
    totalAdmissions: 'Total Admissions',
    activeStudents: 'Domain Students',
    awaitingReview: 'Awaiting Review',
    incompleteApps: 'Returned / Correction',
    approvedApps: 'Approved Admissions',
    rejectedApps: 'Rejected Applications',
    pendingVerification: 'Pending Doc Verify',
    recentActivity: 'Recent Administrative Audits',
    statusBreakdown: 'Application Status Breakdown',
    courseBreakdown: 'Course & Class Distribution',
    verificationRatio: 'Document Verification Ratio',
    filterByDomain: 'Filter Domain',
    allDomains: 'All Domains',
    searchPlaceholder: 'Search by applicant name, ID, contact...',
    newAdmissionBtn: 'New Application',
    exportCsvBtn: 'Export CSV',
    statusAll: 'All Statuses',
    applyStatusUnderReview: 'Under Review',
    applyStatusApproved: 'Approved',
    applyStatusRejected: 'Rejected',
    applyStatusCorrection: 'Correction Needed',
    applyStatusSubmitted: 'Submitted',
    docStatusPending: 'Pending',
    docStatusVerified: 'Verified',
    docStatusRejected: 'Doc Rejected',
    tableApplicant: 'Applicant',
    tableDomainCourse: 'Domain & Course',
    tableScore: 'Prev Score',
    tableAppStatus: 'Application Status',
    tableDocStatus: 'Doc Status',
    tableFee: 'Fee Status',
    tableActions: 'Actions',
    reviewModalTitle: 'Admission Application Review',
    applicantDetails: 'Applicant Information',
    documentsSubmitted: 'Submitted Documents',
    verifyDocBtn: 'Verify',
    rejectDocBtn: 'Reject',
    statusDecision: 'Administrative Decision',
    updateStatusBtn: 'Submit Decision',
    reasonPrompt: 'Reason or Correction Instructions',
    createAdmissionTitle: 'Register New Admission Application',
    submitNewApp: 'Submit Application',
    studentTransferTitle: 'Domain / Campus Student Transfer',
    transferBtn: 'Execute Transfer',
    csvImportTitle: 'Bulk Data Import (CSV)',
    csvUploadBtn: 'Upload & Process CSV',
    auditLogTitle: 'System Audit Logs & Governance History',
    notificationsTitle: 'Administrative Notification Center',
    markAllRead: 'Mark All Read',
    adminProfileTitle: 'Administrator Identity & Domain Scope',
    saveProfile: 'Save Preferences'
  },
  kn: {
    title: 'ಟ್ರಸ್ಟ್ ಒನ್ ಇಆರ್‌ಪಿ — ನಿರ್ವಾಹಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    subtitle: 'ಸ್ವಾಯತ್ತ ಶೈಕ್ಷಣಿಕ ವಲಯ ಆಡಳಿತ, ಪ್ರವೇಶ ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ಶೈಕ್ಷಣಿಕ ನಿರ್ವಹಣೆ',
    tagline: 'ಒಂದು ಟ್ರಸ್ಟ್. ಎಲ್ಲಾ ಕ್ಯಾಂಪಸ್‌ಗಳು. ಸಂಪರ್ಕಿತ.',
    scopeNotice: 'ವಲಯ ನಿಯಮಿತ: ನಿಮ್ಮ ಆಡಳಿತಾತ್ಮಕ ಅಧಿಕಾರವು ಇವರಿಗೆ ಮಾತ್ರ ಸೀಮಿತವಾಗಿದೆ',
    allDomainsNotice: 'ಟ್ರಸ್ಟ್ ಸೂಪರ್ ಅಡ್ಮಿನ್: ಎಲ್ಲಾ 6 ಟ್ರಸ್ಟ್ ಒನ್ ಶೈಕ್ಷಣಿಕ ವಲಯಗಳಿಗೆ ಕೇಂದ್ರ ಪ್ರವೇಶ.',
    tabOverview: 'ಕಾರ್ಯನಿರ್ವಾಹಕ ನೋಟ',
    tabAdmissions: 'ಪ್ರವೇಶ ನಿರ್ವಹಣೆ',
    tabStudents: 'ವಿದ್ಯಾರ್ಥಿ ಪಟ್ಟಿ',
    tabImport: 'ಡೇಟಾ ಆಮದು (CSV)',
    tabReports: 'ವರದಿಗಳು ಮತ್ತು ವಿಶ್ಲೇಷಣೆ',
    tabAudit: 'ಲೆಕ್ಕಪರಿಶೋಧನಾ ಇತಿಹಾಸ',
    tabNotifications: 'ಅಧಿಸೂಚನೆಗಳು',
    tabSettings: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್ಸ್',
    totalAdmissions: 'ಒಟ್ಟು ಪ್ರವೇಶಗಳು',
    activeStudents: 'ವಲಯದ ವಿದ್ಯಾರ್ಥಿಗಳು',
    awaitingReview: 'ಪರಿಶೀಲನೆಯಲ್ಲಿರುವ',
    incompleteApps: 'ತಿದ್ದುಪಡಿಗೆ ಹಿಂತಿರುಗಿಸಿದ',
    approvedApps: 'ಅಂಗೀಕೃತ ಪ್ರವೇಶಗಳು',
    rejectedApps: 'ತಿರಸ್ಕೃತ ಅರ್ಜಿಗಳು',
    pendingVerification: 'ದಾಖಲೆ ಪರಿಶೀಲನೆ ಬಾಕಿ',
    recentActivity: 'ಇತ್ತೀಚಿನ ಆಡಳಿತಾತ್ಮಕ ಲೆಕ್ಕಪರಿಶೋಧನೆ',
    statusBreakdown: 'ಅರ್ಜಿ ಸ್ಥಿತಿ ವಿಭಜನೆ',
    courseBreakdown: 'ಕೋರ್ಸ್ / ತರಗತಿವಾರು ಹಂಚಿಕೆ',
    verificationRatio: 'ದಾಖಲೆ ಪರಿಶೀಲನೆ ಅನುಪಾತ',
    filterByDomain: 'ವಲಯವನ್ನು ಫಿಲ್ಟರ್ ಮಾಡಿ',
    allDomains: 'ಎಲ್ಲಾ ವಲಯಗಳು',
    searchPlaceholder: 'ಅರ್ಜಿದಾರರ ಹೆಸರು, ಐಡಿ ಮೂಲಕ ಹುಡುಕಿ...',
    newAdmissionBtn: 'ಹೊಸ ಅರ್ಜಿ',
    exportCsvBtn: 'CSV ರಫ್ತು',
    statusAll: 'ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು',
    applyStatusUnderReview: 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
    applyStatusApproved: 'ಅಂಗೀಕರಿಸಲಾಗಿದೆ',
    applyStatusRejected: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    applyStatusCorrection: 'ತಿದ್ದುಪಡಿ ಅಗತ್ಯವಿದೆ',
    applyStatusSubmitted: 'ಸಲ್ಲಿಸಲಾಗಿದೆ',
    docStatusPending: 'ಬಾಕಿ ಇದೆ',
    docStatusVerified: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    docStatusRejected: 'ತಿರಸ್ಕೃತ ದಾಖಲೆ',
    tableApplicant: 'ಅರ್ಜಿದಾರರು',
    tableDomainCourse: 'ವಲಯ ಮತ್ತು ಕೋರ್ಸ್',
    tableScore: 'ಹಿಂದಿನ ಅಂಕ',
    tableAppStatus: 'ಅರ್ಜಿ ಸ್ಥಿತಿ',
    tableDocStatus: 'ದಾಖಲೆ ಸ್ಥಿತಿ',
    tableFee: 'ಶುಲ್ಕ ಸ್ಥಿತಿ',
    tableActions: 'ಕ್ರಮಗಳು',
    reviewModalTitle: 'ಪ್ರವೇಶ ಅರ್ಜಿ ಪರಿಶೀಲನೆ',
    applicantDetails: 'ಅರ್ಜಿದಾರರ ಮಾಹಿತಿ',
    documentsSubmitted: 'ಸಲ್ಲಿಸಿದ ದಾಖಲೆಗಳು',
    verifyDocBtn: 'ಪರಿಶೀಲಿಸಿ',
    rejectDocBtn: 'ತಿರಸ್ಕರಿಸಿ',
    statusDecision: 'ಆಡಳಿತಾತ್ಮಕ ತೀರ್ಮಾನ',
    updateStatusBtn: 'ತೀರ್ಮಾನ ನವೀಕರಿಸಿ',
    reasonPrompt: 'ಕಾರಣ ಅಥವಾ ತಿದ್ದುಪಡಿ ಸೂಚನೆಗಳು',
    createAdmissionTitle: 'ಹೊಸ ಪ್ರವೇಶ ಅರ್ಜಿಯನ್ನು ನೋಂದಾಯಿಸಿ',
    submitNewApp: 'ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    studentTransferTitle: 'ವಲಯ / ಕ್ಯಾಂಪಸ್ ವಿದ್ಯಾರ್ಥಿ ವರ್ಗಾವಣೆ',
    transferBtn: 'ವರ್ಗಾವಣೆ ಜಾರಿಗೊಳಿಸಿ',
    csvImportTitle: 'ಬೃಹತ್ ಡೇಟಾ ಆಮದು (CSV)',
    csvUploadBtn: 'CSV ಅಪ್‌ಲೋಡ್ ಮತ್ತು ಪ್ರಕ್ರಿಯೆ',
    auditLogTitle: 'ವ್ಯವಸ್ಥೆ ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆಗಳು',
    notificationsTitle: 'ಆಡಳಿತಾತ್ಮಕ ಅಧಿಸೂಚನೆ ಕೇಂದ್ರ',
    markAllRead: 'ಎಲ್ಲವನ್ನೂ ಓದಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    adminProfileTitle: 'ನಿರ್ವಾಹಕ ಗುರುತು ಮತ್ತು ವಲಯ ವ್ಯಾಪ್ತಿ',
    saveProfile: 'ಆದ್ಯತೆಗಳನ್ನು ಉಳಿಸಿ'
  }
};

export default function AdminDashboard() {
  const { user } = useAuth();

  // Active Admin scope details
  const adminDomain = user?.domain || 'All Domains';
  const isTrustSuperAdmin = !user?.domain || user?.domain === 'All Domains' || user?.access_scope === 'All Domains';
  const initialDomain = isTrustSuperAdmin ? 'All Domains' : user?.domain;

  // Global state
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDomain, setSelectedDomain] = useState(initialDomain);
  const [lang, setLang] = useState(user?.preferred_language || 'en');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Overview metrics state
  const [overviewData, setOverviewData] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  // Unread notifications count
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Load overview data when domain changes
  useEffect(() => {
    loadOverview();
    loadUnreadCount();
  }, [selectedDomain]);

  const loadOverview = () => {
    setLoadingOverview(true);
    setOverviewError(null);
    const domainFilter = selectedDomain === 'All Domains' ? null : selectedDomain;
    getTrustAdminOverview(domainFilter)
      .then(setOverviewData)
      .catch((err) => setOverviewError(err.response?.data?.detail || 'Failed to load domain executive overview.'))
      .finally(() => setLoadingOverview(false));
  };

  const loadUnreadCount = () => {
    getAdminNotifications()
      .then((data) => {
        if (data && data.unread_count !== undefined) {
          setUnreadNotifCount(data.unread_count);
        }
      })
      .catch(() => {});
  };

  return (
    <PageContainer>
      {/* 1. TOP BRANDING & DOMAIN SCOPE BAR */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 bg-indigo-500/25 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold text-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>{user?.admin_id || 'ADM-TRUST-001'}</span>
                <span>•</span>
                <span>{user?.account_label || 'Domain Administrator'}</span>
              </span>

              {/* Status Badge */}
              <span className="inline-flex items-center space-x-1 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Account</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
              <span>{t.title}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              <span className="font-semibold text-indigo-300">{t.tagline}</span> — {t.subtitle}
            </p>
          </div>

          {/* Right Controls: Domain Switcher & Language Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Domain Selector */}
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-2xl shadow-inner">
              <Building className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">
                  {isTrustSuperAdmin ? 'Active Domain' : 'Assigned Domain'}
                </p>
                {isTrustSuperAdmin ? (
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer mt-0.5"
                  >
                    <option value="All Domains" className="bg-slate-900 text-white">All 6 Domains (Trust Wide)</option>
                    {DOMAIN_OPTIONS.map((d) => (
                      <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs font-bold text-indigo-300 mt-0.5">{adminDomain}</p>
                )}
              </div>
            </div>

            {/* Language Toggle (English / Kannada) */}
            <button
              onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-xs font-bold text-slate-200 transition shadow-inner"
              title="Switch language between English and Kannada"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span>{lang === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
            </button>

            {/* Notification Shortcut */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-200 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-indigo-400" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-slate-950">
                  {unreadNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scope banner alert */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span>
              {isTrustSuperAdmin ? (
                <span>{t.allDomainsNotice}</span>
              ) : (
                <span>{t.scopeNotice} <strong className="text-white underline">{adminDomain}</strong>.</span>
              )}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Host: 127.0.0.1:8000 (FastAPI Connected)
          </span>
        </div>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
        {[
          { id: 'overview', label: t.tabOverview, icon: BarChart3 },
          { id: 'admissions', label: t.tabAdmissions, icon: FileCheck },
          { id: 'students', label: t.tabStudents, icon: Users },
          { id: 'import', label: t.tabImport, icon: UploadCloud },
          { id: 'reports', label: t.tabReports, icon: FileText },
          { id: 'audit', label: t.tabAudit, icon: History },
          { id: 'notifications', label: t.tabNotifications, icon: Bell, badge: unreadNotifCount },
          { id: 'settings', label: t.tabSettings, icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-white text-indigo-600' : 'bg-rose-600 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT ROUTING */}
      {activeTab === 'overview' && (
        <OverviewTab
          data={overviewData}
          loading={loadingOverview}
          error={overviewError}
          onRefresh={loadOverview}
          t={t}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'admissions' && (
        <AdmissionsTab
          selectedDomain={selectedDomain}
          isTrustSuperAdmin={isTrustSuperAdmin}
          adminDomain={adminDomain}
          t={t}
          onRefreshOverview={loadOverview}
        />
      )}

      {activeTab === 'students' && (
        <StudentsTab
          selectedDomain={selectedDomain}
          isTrustSuperAdmin={isTrustSuperAdmin}
          adminDomain={adminDomain}
          t={t}
        />
      )}

      {activeTab === 'import' && (
        <DataImportTab
          isTrustSuperAdmin={isTrustSuperAdmin}
          adminDomain={adminDomain}
          t={t}
          onSuccess={() => {
            loadOverview();
            setActiveTab('admissions');
          }}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab
          selectedDomain={selectedDomain}
          isTrustSuperAdmin={isTrustSuperAdmin}
          adminDomain={adminDomain}
          t={t}
        />
      )}

      {activeTab === 'audit' && (
        <AuditTab
          selectedDomain={selectedDomain}
          t={t}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationsTab
          t={t}
          onCountChange={setUnreadNotifCount}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          user={user}
          lang={lang}
          setLang={setLang}
          t={t}
        />
      )}
    </PageContainer>
  );
}

// =========================================================================
// TAB 1: OVERVIEW & ANALYTICS
// =========================================================================
function OverviewTab({ data, loading, error, onRefresh, t, onSelectTab }) {
  if (loading) {
    return <LoadingSpinner message="Querying domain database and computing executive metrics..." />;
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl flex flex-col items-start space-y-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <p className="font-bold">{error || 'Unable to load executive metrics.'}</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, charts, recent_activities } = data;

  return (
    <div className="space-y-6">
      {/* 6 Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <MetricCard
          label={t.totalAdmissions}
          value={metrics.total_admissions_processed}
          sub="All Registered"
          color="indigo"
          icon={FileText}
        />
        <MetricCard
          label={t.activeStudents}
          value={metrics.total_students_in_domain}
          sub="Enrolled Roster"
          color="blue"
          icon={Users}
        />
        <MetricCard
          label={t.awaitingReview}
          value={metrics.awaiting_review}
          sub="Immediate Action"
          color="amber"
          icon={Clock}
          alert={metrics.awaiting_review > 0}
        />
        <MetricCard
          label={t.incompleteApps}
          value={metrics.incomplete_applications}
          sub="Correction Action"
          color="orange"
          icon={RotateCcw}
        />
        <MetricCard
          label={t.approvedApps}
          value={metrics.admissions_approved}
          sub="Clearance Issued"
          color="emerald"
          icon={CheckCircle2}
        />
        <MetricCard
          label={t.rejectedApps}
          value={metrics.admissions_rejected}
          sub="Declined"
          color="rose"
          icon={XCircle}
        />
        <MetricCard
          label={t.pendingVerification}
          value={metrics.pending_verification}
          sub="Docs Awaiting"
          color="purple"
          icon={FileCheck}
        />
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Horizontal Bars */}
        <Card title={t.statusBreakdown} icon={BarChart3} subtitle="Distribution across admission workflow states">
          <div className="space-y-3.5 mt-3">
            {charts.status_distribution?.length > 0 ? (
              charts.status_distribution.map((item, idx) => {
                const total = metrics.total_admissions_processed || 1;
                const pct = Math.round((item.count / total) * 100);
                const colorMap = {
                  UNDER_REVIEW: 'bg-amber-500 text-amber-900',
                  APPROVED: 'bg-emerald-500 text-emerald-900',
                  REJECTED: 'bg-rose-500 text-rose-900',
                  RETURNED_FOR_CORRECTION: 'bg-orange-500 text-orange-900',
                  SUBMITTED: 'bg-blue-500 text-blue-900'
                };
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center space-x-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${colorMap[item.status]?.split(' ')[0] || 'bg-slate-400'}`}></span>
                        <span>{item.status.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="text-slate-500 font-mono">{item.count} apps ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorMap[item.status]?.split(' ')[0] || 'bg-slate-400'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No applications recorded in current domain scope.</p>
            )}
          </div>
        </Card>

        {/* Course / Class Distribution */}
        <Card title={t.courseBreakdown} icon={Layers} subtitle="Admissions split across branches and educational offerings">
          <div className="space-y-3 mt-3">
            {charts.course_distribution?.length > 0 ? (
              charts.course_distribution.slice(0, 6).map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition border border-slate-200/60">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{c.course}</span>
                  </div>
                  <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                    {c.count} applications
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No course distribution data available.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Monthly Trend & Verification Ratio & Recent Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Ratio Card */}
        <Card title={t.verificationRatio} icon={FileCheck} subtitle="Original credentials and certificate validations">
          <div className="flex items-center justify-center py-4">
            <div className="text-center space-y-2">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="12" className="text-slate-100" fill="transparent" />
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-indigo-600 transition-all duration-700"
                    fill="transparent"
                    strokeDasharray="314.15"
                    strokeDashoffset={314.15 - (314.15 * (charts.verification_ratio?.verified_percentage || 0)) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {charts.verification_ratio?.verified_percentage || 0}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Verified</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-600 pt-2">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Verified: {charts.verification_ratio?.verified || 0}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Pending: {charts.verification_ratio?.pending || 0}</span>
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Audit Activities */}
        <div className="lg:col-span-2">
          <Card title={t.recentActivity} icon={History} subtitle="Immutable audit log of administrative actions">
            <div className="divide-y divide-slate-100 mt-2">
              {recent_activities?.length > 0 ? (
                recent_activities.map((act) => (
                  <div key={act.id} className="py-2.5 flex items-start justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{act.action.replace(/_/g, ' ')}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                          {act.domain}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          act.outcome === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {act.outcome}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        By <span className="font-semibold text-slate-700">{act.actor_name}</span> ({act.actor_id})
                        {act.affected_record_id && ` • Record: ${act.affected_record_id}`}
                      </p>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap ml-4">
                      {act.timestamp}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No recent audit logs found.</p>
              )}
            </div>
            <div className="pt-3 border-t border-slate-100 mt-2 text-right">
              <button
                onClick={() => onSelectTab('audit')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-500 inline-flex items-center space-x-1"
              >
                <span>View Full Audit Trail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon: Icon, alert }) {
  const colorMap = {
    indigo: 'border-indigo-200 bg-indigo-50/50 text-indigo-900 icon-text-indigo-600',
    blue: 'border-blue-200 bg-blue-50/50 text-blue-900 icon-text-blue-600',
    amber: 'border-amber-200 bg-amber-50/50 text-amber-900 icon-text-amber-600',
    orange: 'border-orange-200 bg-orange-50/50 text-orange-900 icon-text-orange-600',
    emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-900 icon-text-emerald-600',
    rose: 'border-rose-200 bg-rose-50/50 text-rose-900 icon-text-rose-600',
    purple: 'border-purple-200 bg-purple-50/50 text-purple-900 icon-text-purple-600',
  };

  return (
    <div className={`p-4 rounded-2xl border ${colorMap[color]} shadow-sm transition hover:shadow-md relative overflow-hidden flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-600 truncate">{label}</span>
        <Icon className={`w-4 h-4 opacity-80`} />
      </div>
      <div className="mt-2">
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value !== undefined ? value : 0}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sub}</p>
      </div>
      {alert && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
      )}
    </div>
  );
}

// =========================================================================
// TAB 2: ADMISSIONS ENGINE (MANAGEMENT, VERIFICATION, REVIEW)
// =========================================================================
function AdmissionsTab({ selectedDomain, isTrustSuperAdmin, adminDomain, t, onRefreshOverview }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [reviewAppId, setReviewAppId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadAdmissions();
  }, [selectedDomain, statusFilter, page, searchQuery]);

  const loadAdmissions = () => {
    setLoading(true);
    setError(null);
    getAdminAdmissions({
      domain: selectedDomain === 'All Domains' ? null : selectedDomain,
      status: statusFilter,
      search: searchQuery || null,
      page: page,
      page_size: 10
    })
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load admissions.'))
      .finally(() => setLoading(false));
  };

  const handleExportCsv = () => {
    const activeDomain = selectedDomain === 'All Domains' ? '' : selectedDomain;
    const token = localStorage.getItem('token');
    window.open(`http://127.0.0.1:8000/api/v1/admin-portal/admissions-export?domain=${activeDomain}&token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Action Bar & Filters */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">{t.statusAll}</option>
                <option value="UNDER_REVIEW">{t.applyStatusUnderReview}</option>
                <option value="APPROVED">{t.applyStatusApproved}</option>
                <option value="REJECTED">{t.applyStatusRejected}</option>
                <option value="RETURNED_FOR_CORRECTION">{t.applyStatusCorrection}</option>
                <option value="SUBMITTED">{t.applyStatusSubmitted}</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportCsvBtn}</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newAdmissionBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admissions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12"><LoadingSpinner message="Filtering domain applications..." /></div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 font-bold">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No admission applications found.</p>
            <p className="text-xs text-slate-400">Try adjusting your filter or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">{t.tableApplicant}</th>
                  <th className="px-5 py-3.5">{t.tableDomainCourse}</th>
                  <th className="px-5 py-3.5">{t.tableScore}</th>
                  <th className="px-5 py-3.5">{t.tableAppStatus}</th>
                  <th className="px-5 py-3.5">{t.tableDocStatus}</th>
                  <th className="px-5 py-3.5">{t.tableFee}</th>
                  <th className="px-5 py-3.5 text-right">{t.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">{a.student_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {a.application_id} {a.student_id ? `• ${a.student_id}` : ''}
                        </p>
                        <p className="text-[10px] text-slate-500">{a.contact_number}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-[10px] mb-0.5">
                        {a.educational_domain}
                      </span>
                      <p className="text-xs font-semibold text-slate-800">{a.course_or_class}</p>
                      <p className="text-[10px] text-slate-400">{a.academic_year}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-800">
                        {a.previous_percentage ? `${a.previous_percentage}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={a.application_status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <DocStatusBadge status={a.document_verification_status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.fee_status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {a.fee_status} (₹{a.fee_amount})
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setReviewAppId(a.id)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {items.length} of {total} applications</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 font-bold transition"
            >
              Previous
            </button>
            <span className="font-mono text-slate-800 font-bold">Page {page}</span>
            <button
              disabled={items.length < 10}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 font-bold transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Review Application Modal */}
      {reviewAppId && (
        <AdmissionReviewModal
          applicationId={reviewAppId}
          onClose={() => setReviewAppId(null)}
          onUpdated={() => {
            loadAdmissions();
            onRefreshOverview();
          }}
          t={t}
        />
      )}

      {/* Create Admission Modal */}
      {showCreateModal && (
        <CreateAdmissionModal
          isTrustSuperAdmin={isTrustSuperAdmin}
          adminDomain={adminDomain}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            loadAdmissions();
            onRefreshOverview();
            setShowCreateModal(false);
          }}
          t={t}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    UNDER_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
    RETURNED_FOR_CORRECTION: 'bg-orange-100 text-orange-800 border-orange-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status ? status.replace(/_/g, ' ') : 'N/A'}
    </span>
  );
}

function DocStatusBadge({ status }) {
  const styles = {
    PENDING: 'text-amber-600 bg-amber-50 border-amber-200',
    VERIFIED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    REJECTED: 'text-rose-600 bg-rose-50 border-rose-200'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status] || 'bg-slate-50 text-slate-600'}`}>
      {status || 'PENDING'}
    </span>
  );
}

// -------------------------------------------------------------------------
// ADMISSION REVIEW MODAL
// -------------------------------------------------------------------------
function AdmissionReviewModal({ applicationId, onClose, onUpdated, t }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusDecision, setStatusDecision] = useState('APPROVED');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getAdminAdmissionDetail(applicationId)
      .then((data) => {
        setDetail(data);
        setStatusDecision(data.application.application_status === 'UNDER_REVIEW' ? 'APPROVED' : data.application.application_status);
      })
      .catch((err) => setMsg({ type: 'error', text: 'Failed to load application details.' }))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const handleDocVerify = async (docId, newStatus) => {
    try {
      await verifyAdminAdmissionDoc(applicationId, {
        document_id: docId,
        status: newStatus
      });
      // Refresh
      const updated = await getAdminAdmissionDetail(applicationId);
      setDetail(updated);
      setMsg({ type: 'success', text: `Document marked as ${newStatus}.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Document update failed.' });
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await updateAdminAdmissionStatus(applicationId, {
        status: statusDecision,
        rejection_reason: statusDecision === 'REJECTED' ? reason : null,
        correction_notes: statusDecision === 'RETURNED_FOR_CORRECTION' ? reason : null
      });
      setMsg({ type: 'success', text: 'Application status updated successfully.' });
      onUpdated();
      setTimeout(onClose, 900);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update application.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-3xl"><LoadingSpinner message="Fetching application dossier..." /></div>
      </div>
    );
  }

  if (!detail) return null;
  const app = detail.application;

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 my-8">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-slate-200 pb-4">
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
              {app.educational_domain} • {app.academic_year}
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">{app.student_name}</h2>
            <p className="text-xs text-slate-500 font-mono">
              App ID: {app.application_id} {app.student_id ? `| Student ID: ${app.student_id}` : ''}
            </p>
          </div>

          {msg && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {msg.text}
            </div>
          )}

          {/* Applicant Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">Course / Class</span>
              <span className="font-bold text-slate-800">{app.course_or_class}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Contact Number</span>
              <span className="font-bold text-slate-800">{app.contact_number}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Applicant Email</span>
              <span className="font-bold text-slate-800">{app.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Parent Name</span>
              <span className="font-bold text-slate-800">{app.parent_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Parent Mobile</span>
              <span className="font-bold text-slate-800">{app.parent_contact || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Previous Score</span>
              <span className="font-bold text-indigo-600">
                {app.previous_percentage ? `${app.previous_percentage}% (${app.previous_qualification || 'Marks'})` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Documents Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.documentsSubmitted} ({detail.documents?.length || 0})
            </h3>
            <div className="space-y-2">
              {detail.documents?.length > 0 ? (
                detail.documents.map((doc) => (
                  <div key={doc.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">{doc.document_type}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{doc.file_name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DocStatusBadge status={doc.verification_status} />
                      <button
                        onClick={() => handleDocVerify(doc.id, 'VERIFIED')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition"
                      >
                        {t.verifyDocBtn}
                      </button>
                      <button
                        onClick={() => handleDocVerify(doc.id, 'REJECTED')}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition"
                      >
                        {t.rejectDocBtn}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-2">No documents attached for this application.</p>
              )}
            </div>
          </div>

          {/* Status Update Form */}
          <form onSubmit={handleStatusSubmit} className="pt-4 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t.statusDecision}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Decision</label>
                <select
                  value={statusDecision}
                  onChange={(e) => setStatusDecision(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="APPROVED">APPROVE Admission</option>
                  <option value="REJECTED">REJECT Application</option>
                  <option value="RETURNED_FOR_CORRECTION">Return for Correction</option>
                  <option value="UNDER_REVIEW">Keep Under Review</option>
                </select>
              </div>

              {(statusDecision === 'REJECTED' || statusDecision === 'RETURNED_FOR_CORRECTION') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t.reasonPrompt}</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter reason or instructions..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {submitting ? 'Updating...' : t.updateStatusBtn}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// CREATE ADMISSION MODAL
// -------------------------------------------------------------------------
function CreateAdmissionModal({ isTrustSuperAdmin, adminDomain, onClose, onCreated, t }) {
  const [formData, setFormData] = useState({
    student_name: '',
    email: '',
    contact_number: '',
    parent_name: '',
    parent_contact: '',
    gender: 'Male',
    educational_domain: isTrustSuperAdmin ? 'Polytechnic' : adminDomain,
    course_or_class: '',
    academic_year: '2026-2027',
    admission_category: 'General',
    previous_qualification: '',
    previous_percentage: '',
    fee_amount: '45000'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createAdminAdmission({
        ...formData,
        previous_percentage: formData.previous_percentage ? parseFloat(formData.previous_percentage) : null,
        fee_amount: parseFloat(formData.fee_amount || 0)
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create admission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 my-8">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-black text-slate-900 mb-4">{t.createAdmissionTitle}</h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Applicant Name *</label>
              <input
                type="text"
                required
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Applicant Mobile *</label>
              <input
                type="text"
                required
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Applicant Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Educational Domain *</label>
              {isTrustSuperAdmin ? (
                <select
                  value={formData.educational_domain}
                  onChange={(e) => setFormData({ ...formData, educational_domain: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {DOMAIN_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={adminDomain}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600"
                />
              )}
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Course / Class *</label>
              <input
                type="text"
                required
                placeholder="e.g. Diploma Mechanical or MBBS"
                value={formData.course_or_class}
                onChange={(e) => setFormData({ ...formData, course_or_class: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Parent / Guardian Name</label>
              <input
                type="text"
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Parent Mobile Contact</label>
              <input
                type="text"
                value={formData.parent_contact}
                onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Previous Score (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 88.5"
                value={formData.previous_percentage}
                onChange={(e) => setFormData({ ...formData, previous_percentage: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tuition Fee (₹)</label>
              <input
                type="number"
                value={formData.fee_amount}
                onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Registering...' : t.submitNewApp}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 3: STUDENT DIRECTORY & INTER-DOMAIN TRANSFER
// =========================================================================
function StudentsTab({ selectedDomain, isTrustSuperAdmin, adminDomain, t }) {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [transferTarget, setTransferTarget] = useState(null);

  useEffect(() => {
    loadStudents();
  }, [selectedDomain, page, search]);

  const loadStudents = () => {
    setLoading(true);
    getAdminStudents({
      domain: selectedDomain === 'All Domains' ? null : selectedDomain,
      search: search || null,
      page: page,
      page_size: 10
    })
      .then((res) => {
        setStudents(res.items || []);
        setTotal(res.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative min-w-[300px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search students by name, USN, roll number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <p className="text-xs font-semibold text-slate-500">
          Showing verified student enrollment roster across domain scope.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12"><LoadingSpinner message="Loading domain student records..." /></div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No student records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">USN / Roll No</th>
                  <th className="px-5 py-3.5">Campus / Institution</th>
                  <th className="px-5 py-3.5">Branch / Semester</th>
                  <th className="px-5 py-3.5">Attendance</th>
                  <th className="px-5 py-3.5 text-right">Inter-Domain Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{st.full_name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">{st.enrollment_number}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[10px]">
                        {st.institution || 'Trust One Campus'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {st.branch} (Sem {st.current_semester})
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (st.attendance_percentage || 0) >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {st.attendance_percentage !== null ? `${st.attendance_percentage}%` : '85%'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setTransferTarget(st)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition inline-flex items-center space-x-1"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Transfer</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {transferTarget && (
        <StudentTransferModal
          student={transferTarget}
          onClose={() => setTransferTarget(null)}
          onSuccess={() => {
            setTransferTarget(null);
            loadStudents();
          }}
          t={t}
        />
      )}
    </div>
  );
}

function StudentTransferModal({ student, onClose, onSuccess, t }) {
  const [targetDomain, setTargetDomain] = useState('Engineering College');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await transferAdminStudent(student.id, {
        target_domain: targetDomain,
        remarks: remarks
      });
      setMsg({ type: 'success', text: 'Student transfer completed successfully with audit record.' });
      setTimeout(onSuccess, 800);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Transfer failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-slate-900 mb-2">{t.studentTransferTitle}</h2>
        <p className="text-xs text-slate-500 mb-4">
          Transferring <strong className="text-slate-800">{student.full_name}</strong> ({student.enrollment_number})
        </p>

        {msg && (
          <div className={`p-2.5 rounded-xl text-xs font-semibold mb-3 ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleTransfer} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Educational Domain</label>
            <select
              value={targetDomain}
              onChange={(e) => setTargetDomain(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Transfer Remarks</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Lateral entry approval / Trust management sanctioned"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow disabled:opacity-50"
            >
              {submitting ? 'Executing...' : t.transferBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 4: DATA IMPORT (CSV)
// =========================================================================
function DataImportTab({ isTrustSuperAdmin, adminDomain, t, onSuccess }) {
  const [datasetType, setDatasetType] = useState('admissions');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a valid CSV file.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset_type', datasetType);

    try {
      const res = await importAdminData(formData);
      setResult(res);
      if (res.records_imported > 0) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'CSV Import failed. Check formatting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card title={t.csvImportTitle} icon={UploadCloud} subtitle="Import bulk admission records, administrator accounts, or student datasets">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
            <p className="font-bold text-emerald-800">
              Import Completed! {result.records_imported} of {result.total_records} records processed successfully.
            </p>
            {result.errors?.length > 0 && (
              <div className="pt-2 text-rose-700">
                <p className="font-bold">Errors encountered:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Dataset Type</label>
            <select
              value={datasetType}
              onChange={(e) => setDatasetType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              <option value="admissions">Admission Applications (Admissions Engine)</option>
              <option value="students">Student Roster (Domain Students)</option>
              {isTrustSuperAdmin && <option value="admin_profiles">Administrator Accounts (Trust Wide)</option>}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Supported Headers for Admissions CSV:</p>
            <p className="font-mono text-[10px]">
              student_name, contact_number, email, educational_domain, course_or_class, previous_percentage, parent_name, parent_contact
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{submitting ? 'Parsing & Validating CSV...' : t.csvUploadBtn}</span>
          </button>
        </form>
      </Card>
    </div>
  );
}

// =========================================================================
// TAB 5: REPORTS & ANALYTICS
// =========================================================================
function ReportsTab({ selectedDomain, isTrustSuperAdmin, adminDomain, t }) {
  const [reportType, setReportType] = useState('ADMISSIONS_BY_DOMAIN');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAdminReports({
      report_type: reportType,
      domain: selectedDomain === 'All Domains' ? null : selectedDomain
    })
      .then(setReportData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reportType, selectedDomain]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-700">Select Report:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="ADMISSIONS_BY_DOMAIN">Admissions Volume by Domain</option>
            <option value="APPLICATION_STATUS">Application Status Matrix</option>
            <option value="DOCUMENT_VERIFICATION">Document Verification Audit</option>
          </select>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center space-x-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      <Card title={reportData?.title || 'Report Output'} icon={FileText} subtitle={reportData?.summary}>
        {loading ? (
          <div className="p-8"><LoadingSpinner message="Generating analytical report..." /></div>
        ) : !reportData || !reportData.data ? (
          <p className="text-xs text-slate-400 py-6 text-center">No data found for this report configuration.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  {Object.keys(reportData.data[0] || {}).map((col) => (
                    <th key={col} className="px-5 py-3 capitalize">{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.data.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-5 py-3 font-semibold">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// =========================================================================
// TAB 6: AUDIT TRAIL
// =========================================================================
function AuditTab({ selectedDomain, t }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getAdminAuditLogs({
      domain: selectedDomain === 'All Domains' ? null : selectedDomain,
      search: search || null
    })
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDomain, search]);

  return (
    <Card title={t.auditLogTitle} icon={History} subtitle="Immutable audit log recording every administrative decision and data mutation">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter audit logs by actor, action, or record ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        />
      </div>

      {loading ? (
        <div className="p-8"><LoadingSpinner message="Querying governance audit trail..." /></div>
      ) : logs.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">No audit records logged.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{l.timestamp}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{l.actor_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{l.actor_id}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-indigo-700">{l.action}</td>
                  <td className="px-4 py-3 font-semibold">{l.domain}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{l.affected_record_id || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      l.outcome === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {l.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// =========================================================================
// TAB 7: NOTIFICATIONS
// =========================================================================
function NotificationsTab({ t, onCountChange }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
  }, []);

  const loadNotifs = () => {
    setLoading(true);
    getAdminNotifications()
      .then((data) => {
        setNotifs(data.notifications || []);
        onCountChange(data.unread_count || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleMarkRead = async (id) => {
    try {
      await markAdminNotificationRead(id);
      loadNotifs();
    } catch (err) {}
  };

  return (
    <Card title={t.notificationsTitle} icon={Bell} subtitle="System notifications and urgent admissions alerts">
      {loading ? (
        <div className="p-8"><LoadingSpinner message="Fetching notifications..." /></div>
      ) : notifs.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">No notifications at this time.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {notifs.map((n) => (
            <div key={n.id} className={`p-4 flex items-start justify-between text-xs transition ${
              n.is_read ? 'opacity-60' : 'bg-indigo-50/40 rounded-2xl'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{n.title}</span>
                  {!n.is_read && (
                    <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-black rounded-full">NEW</span>
                  )}
                </div>
                <p className="text-slate-600">{n.message}</p>
                <p className="text-[10px] text-slate-400 font-mono">{n.created_at}</p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-indigo-700 text-[11px] font-bold rounded-xl border border-indigo-200 transition"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// =========================================================================
// TAB 8: PROFILE & SETTINGS
// =========================================================================
function SettingsTab({ user, lang, setLang, t }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [preferredLang, setPreferredLang] = useState(lang);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAdminProfile()
      .then((data) => {
        setProfile(data);
        setPhone(data.phone_number || '');
        setPreferredLang(data.preferred_language || lang);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateAdminProfile({
        phone_number: phone,
        preferred_language: preferredLang
      });
      setLang(preferredLang);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <Card title={t.adminProfileTitle} icon={Settings} subtitle="View assigned role, access scope, and account configuration">
        {loading ? (
          <div className="p-8"><LoadingSpinner message="Loading profile..." /></div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs max-w-xl">
            {saved && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold">
                Preferences saved successfully!
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Admin ID</label>
                <input
                  type="text"
                  disabled
                  value={profile?.admin_id || user?.admin_id || 'N/A'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Assigned Domain</label>
                <input
                  type="text"
                  disabled
                  value={profile?.domain || user?.domain || 'All Domains'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-indigo-700"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={profile?.admin_name || user?.full_name || 'Admin'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Official Email</label>
                <input
                  type="text"
                  disabled
                  value={profile?.email || user?.email || 'N/A'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Preferred Language</label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="en">English</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition"
            >
              {t.saveProfile}
            </button>
          </form>
        )}
      </Card>

      {/* Preserve Attendance Reset Panel for Administrative control */}
      <AdminAttendanceResetPanel />
    </div>
  );
}

function AdminAttendanceResetPanel() {
  const [resetType, setResetType] = useState('SESSIONAL_1');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('Official administrative attendance reset following sessional exams.');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to trigger an official backend attendance reset for ${resetType}? All student percentages will recalculate starting from ${effectiveDate}.`)) {
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await resetAttendanceCycle({
        reset_type: resetType,
        effective_date: effectiveDate,
        remarks: remarks,
      });
      setMessage({ type: 'success', text: res.message || 'Official attendance reset executed successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to execute attendance reset.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Official Attendance Reset Control" icon={RotateCcw} subtitle="Under direct Admin control — Reset student attendance calculation cycle after sessional or semester exams">
      {message && (
        <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-semibold">
          <div>
            <label className="block text-slate-700 mb-1">Reset Exam Event</label>
            <select
              value={resetType}
              onChange={(e) => setResetType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="SESSIONAL_1">Post Sessional Exam 1 Reset</option>
              <option value="SESSIONAL_2">Post Sessional Exam 2 Reset</option>
              <option value="SEMESTER_FINAL">Post Semester Final Exam Reset</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 mb-1">Effective Reset Date</label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-1">Official Remarks</label>
            <input
              type="text"
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              placeholder="e.g. Sessional 1 Exam completed"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-slate-500 italic">
            * Past logs remain archived in backend DB.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{submitting ? 'Executing Reset...' : 'Trigger Attendance Reset'}</span>
          </button>
        </div>
      </form>
    </Card>
  );
}
