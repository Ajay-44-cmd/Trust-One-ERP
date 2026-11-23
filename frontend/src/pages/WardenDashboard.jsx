import React, { useState, useEffect } from 'react';
import PageContainer from '../components/layout/PageContainer';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  getWardenOverview,
  getHostelResidents,
  getHostelMovements,
  recordStudentCheckout,
  recordStudentCheckin,
  getMessMenu,
  updateMessMenu,
  getHostelAllocationEligibility,
  getRoomAvailability,
  allocateHostelBed,
  getHostelAuditLog
} from '../services/erpService';
import {
  Building,
  Users,
  Bed,
  UtensilsCrossed,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  PlusCircle,
  Save,
  RotateCcw,
  ShieldCheck,
  Moon,
  Phone,
  DoorOpen,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  UserCheck,
  History,
  Lock,
  Heart,
  User,
  Shield,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function WardenDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Active Workspace Tab:
  // 'OVERVIEW' | 'GIRLS_HOSTEL' | 'BOYS_HOSTEL' | 'ROOMS' | 'ALLOCATION' | 'AUDIT_LOG' | 'GATE_PASS' | 'MESS_MENU'
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  // Overview Data
  const [overview, setOverview] = useState(null);

  // Residents Data & Filters
  const [residents, setResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentsTotal, setResidentsTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('ALL');
  const [selectedHostelType, setSelectedHostelType] = useState('ALL');

  // Movements Data & Form
  const [movements, setMovements] = useState([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    student_id: '',
    destination: '',
    purpose: 'Personal / Family Visit',
    expected_return: '',
    remarks: ''
  });
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  // Mess Menu Data & Editing
  const [menuList, setMenuList] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [editingMenu, setEditingMenu] = useState(false);
  const [menuFormData, setMenuFormData] = useState({
    breakfast: '',
    lunch: '',
    snacks: '',
    dinner: '',
    special_item: ''
  });
  const [menuSaving, setMenuSaving] = useState(false);

  // Allocation Form State
  const [allocStudentId, setAllocStudentId] = useState('');
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [studentEligibility, setStudentEligibility] = useState(null);
  const [allocBlockNumber, setAllocBlockNumber] = useState(1);
  const [allocRoomNumber, setAllocRoomNumber] = useState('R-350');
  const [allocBedNumber, setAllocBedNumber] = useState('Bed-1');
  const [reassignmentReason, setReassignmentReason] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [allocSuccessMessage, setAllocSuccessMessage] = useState(null);
  const [allocErrorMessage, setAllocErrorMessage] = useState(null);

  // Room Availability State
  const [roomAvailability, setRoomAvailability] = useState(null);
  const [roomAvailLoading, setRoomAvailLoading] = useState(false);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);

  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [ovData, movData, mData] = await Promise.all([
        getWardenOverview().catch(() => null),
        getHostelMovements().catch(() => []),
        getMessMenu().catch(() => [])
      ]);
      setOverview(ovData);
      setMovements(movData);
      setMenuList(mData);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      setSelectedDay(today);

      const todayMenu = mData.find((m) => m.day_of_week.toLowerCase() === today.toLowerCase()) || mData[0];
      if (todayMenu) {
        setMenuFormData({
          breakfast: todayMenu.breakfast,
          lunch: todayMenu.lunch,
          snacks: todayMenu.snacks,
          dinner: todayMenu.dinner,
          special_item: todayMenu.special_item || ''
        });
      }

      await fetchResidents('ALL', 'ALL', '');
    } catch (err) {
      console.error('Failed to load warden dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResidents = async (hostelType, block, query) => {
    try {
      setResidentsLoading(true);
      const params = { limit: 100 };
      if (hostelType && hostelType !== 'ALL') params.hostel_type = hostelType;
      if (block && block !== 'ALL') params.block = block;
      if (query && query.trim()) params.q = query.trim();
      const res = await getHostelResidents(params);
      setResidents(res.items || []);
      setResidentsTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch residents:', err);
    } finally {
      setResidentsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResidents(selectedHostelType, selectedBlock, searchQuery);
  };

  const handleHostelTypeChange = (ht) => {
    setSelectedHostelType(ht);
    setSelectedBlock('ALL');
    fetchResidents(ht, 'ALL', searchQuery);
  };

  const handleBlockChange = (blk) => {
    setSelectedBlock(blk);
    fetchResidents(selectedHostelType, blk, searchQuery);
  };

  // Check Student Eligibility for Allocation
  const handleCheckEligibility = async (e) => {
    e.preventDefault();
    if (!allocStudentId.trim()) return;
    try {
      setEligibilityLoading(true);
      setStudentEligibility(null);
      setAllocErrorMessage(null);
      setAllocSuccessMessage(null);
      const res = await getHostelAllocationEligibility(allocStudentId.trim());
      setStudentEligibility(res);

      if (res.eligible && res.eligible_blocks?.length > 0) {
        const defaultBlk = res.eligible_blocks[0];
        setAllocBlockNumber(defaultBlk);
        fetchRoomAvailability(defaultBlk);
      }
    } catch (err) {
      setAllocErrorMessage(err.response?.data?.detail || 'Student record not found or ineligible.');
    } finally {
      setEligibilityLoading(false);
    }
  };

  const fetchRoomAvailability = async (blkNum) => {
    try {
      setRoomAvailLoading(true);
      const data = await getRoomAvailability({ block_number: blkNum });
      setRoomAvailability(data);
      if (data.rooms && data.rooms.length > 0) {
        const firstAvail = data.rooms.find(r => r.available_count > 0) || data.rooms[0];
        setAllocRoomNumber(firstAvail.room_number);
        if (firstAvail.available_beds.length > 0) {
          setAllocBedNumber(firstAvail.available_beds[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch room availability:', err);
    } finally {
      setRoomAvailLoading(false);
    }
  };

  // Submit Allocation
  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    try {
      setAllocating(true);
      setAllocErrorMessage(null);
      setAllocSuccessMessage(null);

      const payload = {
        student_id: studentEligibility.student_id,
        block_number: Number(allocBlockNumber),
        room_number: allocRoomNumber,
        bed_number: allocBedNumber,
        reassignment_reason: reassignmentReason || undefined
      };

      const res = await allocateHostelBed(payload);
      setAllocSuccessMessage(res.message);
      showMessage(res.message);
      // Reload overview & residents
      loadDashboardData();
      // Re-check eligibility to show updated current allocation
      handleCheckEligibility(e);
    } catch (err) {
      setAllocErrorMessage(err.response?.data?.detail || 'Failed to allocate bed.');
    } finally {
      setAllocating(false);
    }
  };

  // Load Audit Log
  const loadAuditLog = async (page = 1) => {
    try {
      setAuditLoading(true);
      const res = await getHostelAuditLog({ page, page_size: 25 });
      setAuditLogs(res.records || []);
      setAuditTotal(res.total || 0);
      setAuditPage(page);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    setEditingMenu(false);
    const item = menuList.find((m) => m.day_of_week.toLowerCase() === day.toLowerCase());
    if (item) {
      setMenuFormData({
        breakfast: item.breakfast,
        lunch: item.lunch,
        snacks: item.snacks,
        dinner: item.dinner,
        special_item: item.special_item || ''
      });
    }
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    try {
      setMenuSaving(true);
      const updated = await updateMessMenu(selectedDay, menuFormData);
      setMenuList((prev) =>
        prev.map((m) => (m.day_of_week.toLowerCase() === selectedDay.toLowerCase() ? { ...m, ...updated } : m))
      );
      setEditingMenu(false);
      showMessage(`Mess menu for ${selectedDay} updated successfully.`);
    } catch (err) {
      alert('Failed to update mess menu.');
    } finally {
      setMenuSaving(false);
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    try {
      setCheckoutSubmitting(true);
      await recordStudentCheckout(checkoutForm);
      setShowCheckoutModal(false);
      setCheckoutForm({
        student_id: '',
        destination: '',
        purpose: 'Personal / Family Visit',
        expected_return: '',
        remarks: ''
      });
      const updatedMovs = await getHostelMovements();
      setMovements(updatedMovs);
      fetchResidents(selectedHostelType, selectedBlock, searchQuery);
      showMessage('Student Check-Out / Gate Pass successfully issued.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record student checkout.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleCheckin = async (movementId) => {
    try {
      await recordStudentCheckin(movementId);
      const updatedMovs = await getHostelMovements();
      setMovements(updatedMovs);
      fetchResidents(selectedHostelType, selectedBlock, searchQuery);
      showMessage('Student checked into hostel safely.');
    } catch (err) {
      alert('Failed to record check-in.');
    }
  };

  const showMessage = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner message="Loading Trust One Hostel Operations..." />
      </PageContainer>
    );
  }

  const permissions = overview?.permissions || {};
  const canViewGirls = permissions.can_view_girls ?? true;
  const canViewBoys = permissions.can_view_boys ?? true;

  return (
    <PageContainer>
      {/* 1. WARDEN HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-teal-800/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 bg-teal-500/20 border border-teal-400/30 px-3 py-1 rounded-full text-xs font-semibold text-teal-200">
                <Building className="w-3.5 h-3.5 text-teal-300" />
                <span>Trust One Residential Operations</span>
              </span>
              <span className="inline-flex items-center space-x-1 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Strict Gender Segregation Enforced</span>
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              Hostel Warden Control Console
            </h1>
            <p className="text-sm text-teal-200/90 max-w-2xl leading-relaxed">
              Permanent segregation: <span className="font-bold text-pink-300">Blocks 1–3 (Girls Only)</span> &bull; <span className="font-bold text-cyan-300">Blocks 4–6 (Boys Only)</span>. Real-time database verification and double-allocation prevention active.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-teal-200 tracking-wider">Logged In As</p>
                <p className="text-xs font-black text-white">{user?.full_name || overview?.warden_name || 'Hostel Warden'}</p>
              </div>
            </div>
            <div className="text-[11px] text-teal-300/80 font-medium">
              Authorized: {permissions.is_chief_warden ? "All Blocks (1–6)" : `Blocks ${permissions.allowed_block_numbers?.join(', ')}`}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Message Alert */}
      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-black">✕</button>
        </div>
      )}

      {/* 2. WORKSPACE NAVIGATION TABS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: 'OVERVIEW', label: 'Occupancy Overview', icon: Building },
          { id: 'GIRLS_HOSTEL', label: "Girls' Hostel (Blocks 1–3)", icon: Heart, badge: overview?.girls_hostel?.occupied_beds, color: 'text-rose-600' },
          { id: 'BOYS_HOSTEL', label: "Boys' Hostel (Blocks 4–6)", icon: Users, badge: overview?.boys_hostel?.occupied_beds, color: 'text-indigo-600' },
          { id: 'ROOMS', label: 'Resident Directory', icon: DoorOpen },
          { id: 'ALLOCATION', label: 'Bed Allotment & Transfer', icon: UserCheck },
          { id: 'AUDIT_LOG', label: 'Segregation Audit Trail', icon: History },
          { id: 'GATE_PASS', label: 'Gate Pass & Curfew', icon: ArrowRightLeft },
          { id: 'MESS_MENU', label: 'Weekly Mess Menu', icon: UtensilsCrossed },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'AUDIT_LOG') loadAuditLog(1);
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : tab.color || 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OCCUPANCY OVERVIEW (SECTIONS A & B)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Combined Top KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Total Hostel Capacity" icon={Building}>
              <div className="mt-2">
                <p className="text-3xl font-black text-slate-900">{(overview?.total_beds || 4950).toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">Across all 6 segregated blocks</p>
              </div>
            </Card>

            <Card title="Total Occupied Beds" icon={Users}>
              <div className="mt-2">
                <p className="text-3xl font-black text-teal-700">{(overview?.occupied_beds || 4258).toLocaleString()}</p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                    {overview?.occupancy_percentage || 86.0}% Overall Occupancy
                  </span>
                </div>
              </div>
            </Card>

            <Card title="Total Available Beds" icon={CheckCircle2}>
              <div className="mt-2">
                <p className="text-3xl font-black text-emerald-600">{(overview?.vacant_beds || 692).toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">Ready for verified allocation</p>
              </div>
            </Card>

            <Card title="Night Curfew Status" icon={Moon}>
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800">
                    {overview?.curfew_status || 'ALL CLEAR'}
                  </span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    62 Maint.
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Night curfew: 09:30 PM &bull; Biometric access</p>
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* SECTION A: GIRLS' HOSTEL — BLOCKS 1–3                                     */}
          {/* ========================================================================= */}
          <div className="bg-rose-50/40 border-2 border-rose-200 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-rose-950 tracking-tight">
                    Girls' Hostel — Blocks 1–3
                  </h2>
                  <p className="text-xs text-rose-700 font-semibold">
                    Strict Female-Only Residence &bull; Permanent Allocation
                  </p>
                </div>
              </div>

              {canViewGirls ? (
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-rose-200 text-rose-900 shadow-sm">
                    Capacity: <span className="text-rose-600 font-extrabold">{overview?.girls_hostel?.total_capacity?.toLocaleString()}</span>
                  </div>
                  <div className="bg-rose-600 text-white px-3 py-1.5 rounded-xl shadow-sm">
                    Occupied: <span className="font-extrabold">{overview?.girls_hostel?.occupied_beds?.toLocaleString()}</span> ({overview?.girls_hostel?.occupancy_percentage}%)
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-sm">
                    Available: <span className="font-extrabold">{overview?.girls_hostel?.available_beds?.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Access restricted to Girls' Hostel Wardens</span>
                </div>
              )}
            </div>

            {canViewGirls ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {overview?.girls_hostel?.blocks?.map((b) => (
                  <div key={b.block_number} className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm hover:shadow-md transition space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-100 text-rose-800">
                        {b.block_name}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {b.floors} Floors &bull; {b.total_rooms} Rooms
                      </span>
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{b.name}</h3>
                      <p className="text-[11px] text-slate-500">Warden: <span className="font-semibold text-slate-700">{b.supervisor}</span></p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Occupancy</span>
                        <span className="font-black text-rose-700">{b.occupied_beds} / {b.total_capacity} ({b.occupancy_rate}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${b.occupancy_rate}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span className="text-emerald-700 font-bold">{b.available_beds} Vacant Beds</span>
                        <span>{b.maintenance_beds} Maint.</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedHostelType('GIRLS');
                        setSelectedBlock(b.block_name);
                        setActiveTab('ROOMS');
                        fetchResidents('GIRLS', b.block_name, '');
                      }}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>View {b.block_name} Residents</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-2">
                <Lock className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">Girls' Hostel Blocks 1–3 Protected by Role-Based Access Control</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Only wardens assigned to the Girls' Hostel (Sunita Naidu, Lakshmi Kulkarni) or the Chief Administrator can inspect resident lists.
                </p>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION B: BOYS' HOSTEL — BLOCKS 4–6                                      */}
          {/* ========================================================================= */}
          <div className="bg-indigo-50/40 border-2 border-indigo-200 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-indigo-950 tracking-tight">
                    Boys' Hostel — Blocks 4–6
                  </h2>
                  <p className="text-xs text-indigo-700 font-semibold">
                    Strict Male-Only Residence &bull; Permanent Allocation
                  </p>
                </div>
              </div>

              {canViewBoys ? (
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-900 shadow-sm">
                    Capacity: <span className="text-indigo-600 font-extrabold">{overview?.boys_hostel?.total_capacity?.toLocaleString()}</span>
                  </div>
                  <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl shadow-sm">
                    Occupied: <span className="font-extrabold">{overview?.boys_hostel?.occupied_beds?.toLocaleString()}</span> ({overview?.boys_hostel?.occupancy_percentage}%)
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-sm">
                    Available: <span className="font-extrabold">{overview?.boys_hostel?.available_beds?.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Access restricted to Boys' Hostel Wardens</span>
                </div>
              )}
            </div>

            {canViewBoys ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {overview?.boys_hostel?.blocks?.map((b) => (
                  <div key={b.block_number} className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-sm hover:shadow-md transition space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-black bg-indigo-100 text-indigo-800">
                        {b.block_name}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {b.floors} Floors &bull; {b.total_rooms} Rooms
                      </span>
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{b.name}</h3>
                      <p className="text-[11px] text-slate-500">Warden: <span className="font-semibold text-slate-700">{b.supervisor}</span></p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Occupancy</span>
                        <span className="font-black text-indigo-700">{b.occupied_beds} / {b.total_capacity} ({b.occupancy_rate}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${b.occupancy_rate}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span className="text-emerald-700 font-bold">{b.available_beds} Vacant Beds</span>
                        <span>{b.maintenance_beds} Maint.</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedHostelType('BOYS');
                        setSelectedBlock(b.block_name);
                        setActiveTab('ROOMS');
                        fetchResidents('BOYS', b.block_name, '');
                      }}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>View {b.block_name} Residents</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-white rounded-2xl border border-indigo-200 text-center space-y-2">
                <Lock className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">Boys' Hostel Blocks 4–6 Protected by Role-Based Access Control</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Only wardens assigned to the Boys' Hostel (Ramesh Hegde, Prakash Menon) or the Chief Administrator can inspect resident lists.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 & 3: GIRLS' & BOYS' HOSTEL DEDICATED TABS                           */}
      {/* ========================================================================= */}
      {(activeTab === 'GIRLS_HOSTEL' || activeTab === 'BOYS_HOSTEL') && (
        <div className="space-y-4">
          <div className={`p-5 rounded-3xl border-2 ${activeTab === 'GIRLS_HOSTEL' ? 'bg-rose-50/50 border-rose-300' : 'bg-indigo-50/50 border-indigo-300'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-black ${activeTab === 'GIRLS_HOSTEL' ? 'text-rose-950' : 'text-indigo-950'}`}>
                  {activeTab === 'GIRLS_HOSTEL' ? "Girls' Hostel — Blocks 1–3 Workspace" : "Boys' Hostel — Blocks 4–6 Workspace"}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Showing residents strictly assigned to this residential division.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedHostelType(activeTab === 'GIRLS_HOSTEL' ? 'GIRLS' : 'BOYS');
                  setSelectedBlock('ALL');
                  setActiveTab('ROOMS');
                  fetchResidents(activeTab === 'GIRLS_HOSTEL' ? 'GIRLS' : 'BOYS', 'ALL', '');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition ${
                  activeTab === 'GIRLS_HOSTEL' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                Open Full Resident Table →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STUDENT RESIDENT DIRECTORY (WITH GENDER & BLOCK FILTER)           */}
      {/* ========================================================================= */}
      {activeTab === 'ROOMS' && (
        <div className="space-y-4">
          <Card title="Student Hostel Accommodation & Resident Directory" icon={Users}>
            {/* Filter & Search Bar */}
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Student Name, ID, Block, Room, or Bed..."
                    className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Search
                  </button>
                </form>

                {/* Hostel Type Filter Tabs */}
                <div className="flex items-center space-x-1.5 text-xs font-bold">
                  {canViewGirls && canViewBoys && (
                    <button
                      onClick={() => handleHostelTypeChange('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        selectedHostelType === 'ALL'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      All Hostels
                    </button>
                  )}
                  {canViewGirls && (
                    <button
                      onClick={() => handleHostelTypeChange('GIRLS')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 ${
                        selectedHostelType === 'GIRLS'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                      }`}
                    >
                      <Heart className="w-3 h-3 fill-current" />
                      <span>Girls' Only (Blocks 1–3)</span>
                    </button>
                  )}
                  {canViewBoys && (
                    <button
                      onClick={() => handleHostelTypeChange('BOYS')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 ${
                        selectedHostelType === 'BOYS'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>Boys' Only (Blocks 4–6)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Block Filters */}
              <div className="flex items-center space-x-1 overflow-x-auto text-xs font-bold pt-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mr-2">Block Filter:</span>
                <button
                  onClick={() => handleBlockChange('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${selectedBlock === 'ALL' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  All Available
                </button>

                {(selectedHostelType === 'ALL' || selectedHostelType === 'GIRLS') && canViewGirls &&
                  ['Block 1', 'Block 2', 'Block 3'].map((blk) => (
                    <button
                      key={blk}
                      onClick={() => handleBlockChange(blk)}
                      className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                        selectedBlock === blk ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      <Heart className="w-2.5 h-2.5 fill-current" />
                      <span>{blk}</span>
                    </button>
                  ))
                }

                {(selectedHostelType === 'ALL' || selectedHostelType === 'BOYS') && canViewBoys &&
                  ['Block 4', 'Block 5', 'Block 6'].map((blk) => (
                    <button
                      key={blk}
                      onClick={() => handleBlockChange(blk)}
                      className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                        selectedBlock === blk ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                      }`}
                    >
                      <Users className="w-2.5 h-2.5" />
                      <span>{blk}</span>
                    </button>
                  ))
                }
              </div>
            </div>

            {/* Residents Table */}
            {residentsLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner message="Filtering segregated hostel directory..." />
              </div>
            ) : residents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                No hostel residents match the selected filters or search query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Student Name & ID</th>
                      <th className="py-3 px-3">Gender</th>
                      <th className="py-3 px-3">Hostel Block</th>
                      <th className="py-3 px-3">Room & Bed</th>
                      <th className="py-3 px-3">Course / Year</th>
                      <th className="py-3 px-3">Movement Status</th>
                      <th className="py-3 px-3">Parent Contact</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {residents.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{r.student_name}</p>
                          <p className="font-mono text-[11px] text-teal-700 font-bold">{r.student_id}</p>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            r.gender === 'Female' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {r.gender}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                            r.block_number in [1, 2, 3] || ['Block 1', 'Block 2', 'Block 3'].includes(r.block)
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}>
                            {r.block}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{r.room_number}</p>
                          <p className="text-[11px] text-slate-500 font-semibold">{r.bed_number}</p>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          <p className="font-semibold truncate max-w-[140px]">{r.course_stream}</p>
                          <p className="text-[10px] text-slate-400">{r.year_class}</p>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.movement_status === 'OUT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {r.status_badge}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          <div className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{r.parent_contact_masked}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setAllocStudentId(r.student_id);
                              setActiveTab('ALLOCATION');
                              handleCheckEligibility({ preventDefault: () => {} });
                            }}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Transfer Bed
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HOSTEL BED ALLOTMENT & TRANSFER (STRICT GENDER VALIDATION)         */}
      {/* ========================================================================= */}
      {activeTab === 'ALLOCATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Student Eligibility Verification */}
          <Card title="Step 1: Verify Student Eligibility" icon={UserCheck} subtitle="Automatic gender check and block restriction">
            <form onSubmit={handleCheckEligibility} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter Student ID or Roll Number
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={allocStudentId}
                    onChange={(e) => setAllocStudentId(e.target.value)}
                    placeholder="e.g. DEG-2026-00001, ENG-2026-00002"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    required
                  />
                  <button
                    type="submit"
                    disabled={eligibilityLoading}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {eligibilityLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Verify</span>
                  </button>
                </div>
              </div>

              {/* Eligibility Result Box */}
              {studentEligibility && (
                <div className={`p-4 rounded-2xl border ${
                  studentEligibility.eligible ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">{studentEligibility.student_name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      studentEligibility.gender === 'Female' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {studentEligibility.gender}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Student ID: <span className="font-mono font-bold text-slate-800">{studentEligibility.student_id}</span></p>
                    <p>Institution: <span className="font-semibold text-slate-800">{studentEligibility.institution}</span></p>
                    <p>Course & Year: <span className="font-semibold text-slate-800">{studentEligibility.course_stream} &bull; {studentEligibility.year_class}</span></p>
                  </div>

                  {studentEligibility.has_active_allocation ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                      <p className="font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Currently Allocated Accommodation:</span>
                      </p>
                      <p className="font-mono font-bold">
                        {studentEligibility.current_allocation.block_name} &bull; Room {studentEligibility.current_allocation.room_number} &bull; {studentEligibility.current_allocation.bed_number}
                      </p>
                      <p className="text-[11px] text-amber-700">Reassignment reason will be required below.</p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-100/60 rounded-xl text-xs font-bold text-emerald-800">
                      ✓ Fresh Allocation Eligible: No active hostel allocation on file.
                    </div>
                  )}

                  {/* Permitted Blocks Pill Box */}
                  <div className="pt-1">
                    <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                      Eligible Residential Blocks (Strict Gender Match):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {studentEligibility.eligible_block_names?.map((bn) => (
                        <span key={bn} className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                          studentEligibility.gender === 'Female' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                          {bn}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </Card>

          {/* RIGHT: Bed Allocation Form */}
          <Card title="Step 2: Assign Block, Room & Bed" icon={Bed} subtitle="Double allocation strictly prevented by database constraint">
            {studentEligibility?.eligible ? (
              <form onSubmit={handleAllocateSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Eligible Block
                  </label>
                  <select
                    value={allocBlockNumber}
                    onChange={(e) => {
                      const blk = Number(e.target.value);
                      setAllocBlockNumber(blk);
                      fetchRoomAvailability(blk);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {studentEligibility.eligible_block_options?.map((opt) => (
                      <option key={opt.number} value={opt.number}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Room Number
                    </label>
                    <input
                      type="text"
                      value={allocRoomNumber}
                      onChange={(e) => setAllocRoomNumber(e.target.value)}
                      placeholder="e.g. R-101, R-350"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bed Position
                    </label>
                    <select
                      value={allocBedNumber}
                      onChange={(e) => setAllocBedNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Bed-1">Bed-1 (Window side)</option>
                      <option value="Bed-2">Bed-2 (Center)</option>
                      <option value="Bed-3">Bed-3 (Door side)</option>
                    </select>
                  </div>
                </div>

                {studentEligibility.has_active_allocation && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Authorized Reassignment Reason <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={reassignmentReason}
                      onChange={(e) => setReassignmentReason(e.target.value)}
                      placeholder="State institutional justification for reallocating student to a new room/block..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[70px]"
                      required
                    />
                  </div>
                )}

                {allocErrorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{allocErrorMessage}</span>
                  </div>
                )}

                {allocSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{allocSuccessMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={allocating}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {allocating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{studentEligibility.has_active_allocation ? "Confirm Authorized Reassignment" : "Complete Fresh Bed Allocation"}</span>
                </button>
              </form>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold space-y-2">
                <DoorOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p>Please enter and verify a student in Step 1 to unlock the allocation form.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SEGREGATION AUDIT TRAIL LOG                                       */}
      {/* ========================================================================= */}
      {activeTab === 'AUDIT_LOG' && (
        <Card title="Permanent Hostel Gender Segregation & Allocation Audit Log" icon={History}>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <p className="text-slate-500 font-semibold">
                Total Recorded Migration & Allocation Events: <span className="font-bold text-slate-900">{auditTotal.toLocaleString()}</span>
              </p>
              <div className="flex items-center space-x-2">
                <button
                  disabled={auditPage <= 1 || auditLoading}
                  onClick={() => loadAuditLog(auditPage - 1)}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-bold text-slate-800">Page {auditPage}</span>
                <button
                  disabled={auditPage * 25 >= auditTotal || auditLoading}
                  onClick={() => loadAuditLog(auditPage + 1)}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            {auditLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner message="Loading audit trail..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Student Name & ID</th>
                      <th className="py-3 px-3">Gender</th>
                      <th className="py-3 px-3">Action Type</th>
                      <th className="py-3 px-3">Previous Allocation</th>
                      <th className="py-3 px-3">New Segregated Allocation</th>
                      <th className="py-3 px-3">Reason / Justification</th>
                      <th className="py-3 px-3">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{log.created_at}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{log.student_name}</p>
                          <p className="font-mono text-[10px] text-teal-700">{log.student_id}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            log.gender === 'Female' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {log.gender}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {log.action_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {log.previous_block} ({log.previous_room})
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 text-[11px]">
                          <span className={log.gender === 'Female' ? 'text-rose-700' : 'text-indigo-700'}>
                            {log.new_block} &bull; {log.new_room} ({log.new_bed})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate text-[11px]" title={log.reason}>
                          {log.reason}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {log.performed_by}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: GATE PASS & CURFEW (PRESERVED)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'GATE_PASS' && (
        <Card
          title="Gate Pass Movement & Curfew Compliance Log"
          icon={ArrowRightLeft}
          action={
            <button
              onClick={() => setShowCheckoutModal(true)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Issue New Gate Pass</span>
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Room & Block</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3">Check-Out Time</th>
                  <th className="py-3 px-3">Expected Return</th>
                  <th className="py-3 px-3">Movement Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">{m.student_name}</td>
                    <td className="py-3 px-3 text-slate-600">{m.block} &bull; {m.room_number}</td>
                    <td className="py-3 px-3 text-slate-800">{m.destination}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{m.checkout_time ? new Date(m.checkout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{m.expected_return ? new Date(m.expected_return).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'OUT' ? 'bg-amber-100 text-amber-800' : (m.status === 'LATE_RETURN' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800')
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {m.status === 'OUT' && (
                        <button
                          onClick={() => handleCheckin(m.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Check In
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: WEEKLY MESS MENU (PRESERVED)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'MESS_MENU' && (
        <div className="space-y-4">
          <Card title="7-Day Institutional Hostel Dining & Food Menu" icon={UtensilsCrossed}>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-3 border-b border-slate-100 text-xs font-bold">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <button
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    selectedDay.toLowerCase() === day.toLowerCase()
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-4 mt-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-base">{selectedDay}'s Food Menu</h3>
                <button
                  onClick={() => setEditingMenu(!editingMenu)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {editingMenu ? 'Cancel Editing' : 'Edit Meal Items'}
                </button>
              </div>

              {editingMenu ? (
                <form onSubmit={handleSaveMenu} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Breakfast (07:30 - 09:00 AM)</label>
                      <input
                        type="text"
                        value={menuFormData.breakfast}
                        onChange={(e) => setMenuFormData({ ...menuFormData, breakfast: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Lunch (12:30 - 02:00 PM)</label>
                      <input
                        type="text"
                        value={menuFormData.lunch}
                        onChange={(e) => setMenuFormData({ ...menuFormData, lunch: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Evening Snacks (05:00 - 06:00 PM)</label>
                      <input
                        type="text"
                        value={menuFormData.snacks}
                        onChange={(e) => setMenuFormData({ ...menuFormData, snacks: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dinner (07:30 - 09:30 PM)</label>
                      <input
                        type="text"
                        value={menuFormData.dinner}
                        onChange={(e) => setMenuFormData({ ...menuFormData, dinner: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Special Item / Chef's Special</label>
                    <input
                      type="text"
                      value={menuFormData.special_item}
                      onChange={(e) => setMenuFormData({ ...menuFormData, special_item: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={menuSaving}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>{menuSaving ? 'Saving...' : 'Save Updated Mess Menu'}</span>
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[11px] uppercase font-bold text-teal-800">Breakfast Service</p>
                    <p className="text-xs font-semibold text-slate-800 mt-1">{menuFormData.breakfast}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[11px] uppercase font-bold text-teal-800">Lunch Service</p>
                    <p className="text-xs font-semibold text-slate-800 mt-1">{menuFormData.lunch}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[11px] uppercase font-bold text-teal-800">Evening Tea & Snacks</p>
                    <p className="text-xs font-semibold text-slate-800 mt-1">{menuFormData.snacks}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[11px] uppercase font-bold text-teal-800">Dinner Service</p>
                    <p className="text-xs font-semibold text-slate-800 mt-1">{menuFormData.dinner}</p>
                  </div>
                  {menuFormData.special_item && (
                    <div className="md:col-span-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-[11px] uppercase font-bold text-amber-800">Chef's Special Special Highlight</p>
                      <p className="text-xs font-bold text-amber-900 mt-0.5">{menuFormData.special_item}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* CHECKOUT / GATE PASS MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">Issue Student Gate Pass</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-700 font-black">✕</button>
            </div>
            <form onSubmit={handleCheckoutSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student ID or Name</label>
                <input
                  type="text"
                  value={checkoutForm.student_id}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, student_id: e.target.value })}
                  placeholder="e.g. DEG-2026-00001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination Address</label>
                <input
                  type="text"
                  value={checkoutForm.destination}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, destination: e.target.value })}
                  placeholder="e.g. Home / Town Market / Hospital"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Purpose of Visit</label>
                <select
                  value={checkoutForm.purpose}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="Personal / Family Visit">Personal / Family Visit</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Academic Project / Field Work">Academic Project / Field Work</option>
                  <option value="Weekend Leave Approved">Weekend Leave Approved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Return Date & Time</label>
                <input
                  type="datetime-local"
                  value={checkoutForm.expected_return}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, expected_return: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutSubmitting}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-md cursor-pointer"
                >
                  {checkoutSubmitting ? 'Authorizing...' : 'Authorize & Issue Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
