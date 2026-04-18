import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Search, Plus, Trash2, MoreVertical, BellOff, Bell, CreditCard,
  Mail, TrendingUp, HelpCircle, Activity, CalendarClock, StickyNote, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Filter, X, CheckCircle2, XCircle, AlertTriangle, UserMinus, Play, Pause, Check
} from 'lucide-react';
import Dropdown from '../components/Dropdown';

// ─── Custom Checkbox ─────────────────────────────────────────────────
const Checkbox: React.FC<{ checked: boolean; onChange: () => void; className?: string }> = ({ checked, onChange, className = '' }) => (
  <button type="button" onClick={onChange}
    className={`w-[18px] h-[18px] rounded flex items-center justify-center border-2 transition-all duration-150 shrink-0 ${checked ? 'bg-brand-500 border-brand-500 shadow-[0_0_6px_rgba(57,255,20,0.3)]' : 'bg-transparent border-gray-600 hover:border-gray-400'} ${className}`}>
    {checked && <Check size={12} className="text-white" strokeWidth={3} />}
  </button>
);

// ─── Custom Number Input ─────────────────────────────────────────────
const NumberInput = ({ value, onChange, min = 1, step = 1, placeholder = '' }: any) => (
  <div className="flex border border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all bg-gray-800">
    <button type="button" onClick={() => onChange(value === '' ? min : Math.max(min, Number(value) - step))} className="bg-gray-800 border-r border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition w-10 shrink-0 flex items-center justify-center text-lg leading-none select-none">-</button>
    <input type="number" min={min} required value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value === '' ? '' : parseInt(e.target.value) || min)}
      className="w-full bg-transparent border-0 px-2 py-2.5 text-sm text-white text-center focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
    <button type="button" onClick={() => onChange(Number(value) + step)} className="bg-gray-800 border-l border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition w-10 shrink-0 flex items-center justify-center text-lg leading-none select-none">+</button>
  </div>
);

// ─── Types ───────────────────────────────────────────────────────────
interface Member {
  _id: string;
  name: string;
  phone: string;
  planType: string;
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'frozen' | 'expired';
  mutedUntil: string | null;
  customReminderDays: number[];
  outstandingBalance: number;
  lastPartialPaymentDate: string | null;
  notes: { _id: string; text: string; createdAt: string; context: string }[];
  currentStreak: number;
  longestStreak: number;
  lastAttendanceDate: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helper: Payment Status ──────────────────────────────────────────
function getPaymentStatus(m: Member) {
  // Trial period: mutedUntil is set and member was created recently
  const isInTrial = m.mutedUntil && new Date(m.mutedUntil) > new Date() && m.outstandingBalance > 0
    && (new Date().getTime() - new Date(m.startDate).getTime()) < 10 * 24 * 60 * 60 * 1000; // within ~10 days of creation
  if (isInTrial)
    return { label: 'Trial Period', color: 'bg-blue-500/10 text-blue-400', key: 'trial' as const };
  if (m.outstandingBalance > 0 && new Date(m.endDate) < new Date())
    return { label: `Overdue ₹${m.outstandingBalance}`, color: 'bg-red-500/10 text-red-400', key: 'overdue' as const };
  if (m.outstandingBalance > 0)
    return { label: `₹${m.outstandingBalance} due`, color: 'bg-amber-500/10 text-amber-400', key: 'due' as const };
  return { label: 'Paid ✓', color: 'bg-green-500/10 text-green-400', key: 'paid' as const };
}

function isMuted(m: Member) {
  return m.mutedUntil && new Date(m.mutedUntil) > new Date();
}

function hasOutstanding(m: Member) {
  return m.outstandingBalance > 0;
}

// ─── Input class (DRY) ──────────────────────────────────────────────
const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 sm:py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all min-h-[48px] sm:min-h-0';
const labelClass = 'block text-xs font-medium text-gray-400 mb-1.5';
const btnPrimary = 'bg-brand-500 hover:bg-brand-600 text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors min-h-[48px] sm:min-h-0';
const btnGhost = 'px-4 py-3 sm:py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors min-h-[48px] sm:min-h-0';

// ─── Modal Wrapper ───────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Confirm Modal (replaces browser confirm()) ─────────────────────
const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', confirmColor = 'bg-brand-500 hover:bg-brand-600', icon, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          {icon || <AlertTriangle className="text-amber-400" size={24} />}
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className={btnGhost}>Cancel</button>
          <button onClick={onConfirm} className={`${confirmColor} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: '', payment: '', muted: '' });
  const [sort, setSort] = useState({ field: 'createdAt', order: 'desc' });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState<Member | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Member | null>(null);
  const [showDueDateModal, setShowDueDateModal] = useState<Member | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<Member | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<Member | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Custom confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel?: string; confirmColor?: string;
    icon?: React.ReactNode; onConfirm: () => void;
  } | null>(null);

  // Quick-action dropdown (fixed positioning to escape overflow-hidden)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0 });

  // Checkbox selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Expandable Mobile Layout
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const toggleMember = (id: string) => {
    const newSet = new Set(expandedMembers);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedMembers(newSet);
  };

  // Add member form
  const [form, setForm] = useState({ name: '', phone: '', planType: 'Monthly', monthlyAmount: '', durationMonths: 1, note: '' });

  // ── Stats badges ──────────────────────────────────────────────────
  const [stats, setStats] = useState({ total: 0, active: 0, dueThisWeek: 0, withBalance: 0, totalOutstanding: 0 });

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '20',
        sort: sort.field,
        order: sort.order,
      };
      if (searchTerm) params.search = searchTerm;
      if (filters.status) params.status = filters.status;
      if (filters.payment) params.payment = filters.payment;
      if (filters.muted) params.muted = filters.muted;

      const { data } = await api.get('/members', { params });
      setMembers(data.data);
      setPagination(data.pagination);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, sort]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/members/stats');
      setStats(data.data);
    } catch { }
  };

  useEffect(() => {
    fetchMembers(1);
    fetchStats();
  }, [fetchMembers]);

  // NOTE: We intentionally do NOT clear selections on search/filter changes
  // so owner can search for members and still keep previous selections.

  // ── Checkbox helpers ──────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map(m => m._id)));
    }
  };

  const selectedMembers = members.filter(m => selectedIds.has(m._id));

  // ── Batch "Mark as Paid" ──────────────────────────────────────────
  const handleBatchPaid = () => {
    // Only include members with outstanding balance
    const membersWithDues = selectedMembers.filter(m => m.outstandingBalance > 0);
    if (membersWithDues.length === 0) return toast.error('No selected members have outstanding dues.');
    
    const totalDue = membersWithDues.reduce((sum, m) => sum + m.outstandingBalance, 0);
    const names = membersWithDues.map(m => m.name).join(', ');

    setConfirmDialog({
      title: 'Mark as Paid',
      message: `Record full payment of ₹${totalDue} for ${membersWithDues.length} member(s)?\n\n${names}`,
      confirmLabel: `Pay ₹${totalDue}`,
      confirmColor: 'bg-green-600 hover:bg-green-700',
      icon: <CheckCircle2 className="text-green-400" size={24} />,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          for (const m of membersWithDues) {
            await api.post(`/members/${m._id}/partial-payment`, { amount: m.outstandingBalance, note: 'Full payment (batch)' });
          }
          toast.success(`${membersWithDues.length} payment(s) recorded`);
          setSelectedIds(new Set());
          fetchMembers(pagination.page);
          fetchStats();
        } catch { }
      },
    });
  };

  // ── Create Member ─────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Please enter a valid name.');
    if (form.phone.length !== 10) return toast.error('Please enter a valid 10-digit phone number.');
    if (!form.monthlyAmount || Number(form.monthlyAmount) <= 0) return toast.error('Please enter a valid monthly fee.');

    try {
      const startDate = new Date();
      // 1 week trial + plan duration
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // 1 week trial
      endDate.setMonth(endDate.getMonth() + form.durationMonths);

      const totalDue = Number(form.monthlyAmount) * form.durationMonths;

      await api.post('/members', {
        name: form.name,
        phone: form.phone,
        planType: form.planType,
        monthlyAmount: Number(form.monthlyAmount),
        startDate,
        endDate,
        outstandingBalance: totalDue,
        note: form.note || undefined,
      });
      toast.success('Member added — 1 week trial starts now');
      setShowAddModal(false);
      setForm({ name: '', phone: '', planType: 'Monthly', monthlyAmount: '', durationMonths: 1, note: '' });
      fetchMembers(1);
      fetchStats();
    } catch { }
  };

  // ── Delete (with custom confirm) ──────────────────────────────────
  const handleDelete = (id: string) => {
    const member = members.find(m => m._id === id);
    setConfirmDialog({
      title: 'Delete Member',
      message: `Are you sure you want to permanently delete ${member?.name || 'this member'}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      icon: <Trash2 className="text-red-400" size={24} />,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/members/${id}`);
          toast.success('Member deleted');
          fetchMembers(pagination.page);
          fetchStats();
        } catch { }
      },
    });
  };

  // ── Mute ──────────────────────────────────────────────────────────
  const [muteForm, setMuteForm] = useState({ mutedUntil: '', note: '', indefinite: false });
  const handleMute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMuteModal) return;
    try {
      await api.put(`/members/${showMuteModal._id}/mute`, {
        mutedUntil: muteForm.indefinite ? new Date('2099-12-31').toISOString() : muteForm.mutedUntil || null,
        note: muteForm.note,
      });
      toast.success(muteForm.mutedUntil || muteForm.indefinite ? 'Member muted' : 'Member unmuted');
      setShowMuteModal(null);
      setMuteForm({ mutedUntil: '', note: '', indefinite: false });
      fetchMembers(pagination.page);
    } catch { }
  };

  // ── Partial Payment ───────────────────────────────────────────────
  const [payForm, setPayForm] = useState({ amount: '', note: '' });
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    try {
      await api.post(`/members/${showPaymentModal._id}/partial-payment`, {
        amount: Number(payForm.amount),
        note: payForm.note,
      });
      toast.success('Payment recorded');
      setShowPaymentModal(null);
      setPayForm({ amount: '', note: '' });
      fetchMembers(pagination.page);
      fetchStats();
    } catch { }
  };

  // ── Due Date ──────────────────────────────────────────────────────
  const [dueDateForm, setDueDateForm] = useState({ endDate: '', note: '' });
  const handleDueDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDueDateModal) return;
    try {
      await api.put(`/members/${showDueDateModal._id}/due-date`, {
        endDate: dueDateForm.endDate,
        note: dueDateForm.note,
      });
      toast.success('Due date updated');
      setShowDueDateModal(null);
      setDueDateForm({ endDate: '', note: '' });
      fetchMembers(pagination.page);
    } catch { }
  };

  // ── Add Note ──────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState('');
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showNoteModal) return;
    try {
      await api.post(`/members/${showNoteModal._id}/notes`, { text: noteText });
      toast.success('Note added');
      setShowNoteModal(null);
      setNoteText('');
      fetchMembers(pagination.page);
    } catch { }
  };

  // ── Quick Pay Full (with custom confirm) ──────────────────────────
  const handleFullPayment = (m: Member) => {
    if (m.outstandingBalance <= 0) return toast('No outstanding dues for this member.');
    const totalDue = m.outstandingBalance;
    setConfirmDialog({
      title: 'Mark Full Payment',
      message: `Record full payment of ₹${totalDue} for ${m.name}?`,
      confirmLabel: `Pay ₹${totalDue}`,
      confirmColor: 'bg-green-600 hover:bg-green-700',
      icon: <CheckCircle2 className="text-green-400" size={24} />,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.post(`/members/${m._id}/partial-payment`, { amount: totalDue, note: 'Full payment' });
          toast.success('Full payment recorded');
          fetchMembers(pagination.page);
          fetchStats();
        } catch { }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#0e0e0e] pb-4 pt-1 -mx-1 px-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Members</h1>
            <p className="text-gray-500 text-sm mt-1">
              {stats.total} total · {stats.active} active · {stats.withBalance > 0 && (
                <span className="text-amber-400">{stats.withBalance} with dues (₹{stats.totalOutstanding})</span>
              )}
            </p>
          </div>
          <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end gap-2">
            {/* Overall Payment Summary Badge */}
            {stats.totalOutstanding > 0 ? (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                ₹{stats.totalOutstanding} outstanding
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                All Clear ✓
              </span>
            )}
            <button onClick={() => setShowAddModal(true)} className={`flex items-center gap-2 shrink-0 ${btnPrimary}`}>
              <Plus size={16} /> Add Member
            </button>
          </div>
        </div>

        {/* ── Search + Filter + Batch Pay Bar ─────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text" placeholder="Search by name or phone..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <button onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white bg-gray-900 border border-gray-800 min-h-[48px] sm:min-h-0">
            <Filter size={16} /> Filters
            {(filters.status || filters.payment || filters.muted) && (
              <span className="w-2 h-2 rounded-full bg-brand-400" />
            )}
          </button>
          {/* Batch Pay — inline with search & filter */}
          {selectedIds.size > 0 && (
            <button onClick={handleBatchPaid}
              className="flex w-full sm:w-auto items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-green-900/30 min-h-[48px] sm:min-h-0">
              <CreditCard size={16} /> Mark as Paid ({selectedIds.size})
            </button>
          )}
        </div>

        {/* ── Filter Panel ────────────────────────────────────────── */}
        {showFilterPanel && (
          <div className="mt-3 rounded-2xl border border-gray-800 bg-gray-900 relative">
            <div className="h-[2px] rounded-t-2xl bg-gradient-to-r from-brand-500/60 via-brand-400/30 to-transparent" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Filter size={14} className="text-brand-400" /> Filter Members
                </p>
                {(filters.status || filters.payment || filters.muted) && (
                  <button onClick={() => setFilters({ status: '', payment: '', muted: '' })}
                    className="text-sm text-gray-400 hover:text-red-400 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-700 hover:border-red-500/40 bg-gray-800 hover:bg-red-500/10 transition-all">
                    <X size={14} /> Reset All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-2 pl-1">Status</label>
                  <Dropdown
                    value={filters.status}
                    onChange={(val) => setFilters({ ...filters, status: val })}
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'active', label: 'Active' },
                      { value: 'frozen', label: 'Frozen' },
                      { value: 'expired', label: 'Expired' },
                    ]}
                    className={`w-full bg-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500/40 min-h-[48px] sm:min-h-0 ${
                      filters.status ? 'border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]' : 'border border-gray-700 hover:border-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-2 pl-1">Payment</label>
                  <Dropdown
                    value={filters.payment}
                    onChange={(val) => setFilters({ ...filters, payment: val })}
                    options={[
                      { value: '', label: 'All Payments' },
                      { value: 'full', label: 'Fully Paid' },
                      { value: 'partial', label: 'Partial Due' },
                      { value: 'overdue', label: 'Overdue' },
                    ]}
                    className={`w-full bg-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500/40 min-h-[48px] sm:min-h-0 ${
                      filters.payment ? 'border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]' : 'border border-gray-700 hover:border-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-2 pl-1">Alerts</label>
                  <Dropdown
                    value={filters.muted}
                    onChange={(val) => setFilters({ ...filters, muted: val })}
                    options={[
                      { value: '', label: 'All Members' },
                      { value: 'true', label: 'Muted Only' },
                      { value: 'false', label: 'Not Muted' },
                    ]}
                    className={`w-full bg-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500/40 min-h-[48px] sm:min-h-0 ${
                      filters.muted ? 'border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]' : 'border border-gray-700 hover:border-gray-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Table (desktop) / Cards (mobile) ──────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="px-3 py-3 text-left w-10">
                  <Checkbox
                    checked={members.length > 0 && selectedIds.size === members.length}
                    onChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Fee</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-left">Reminders</th>
                <th className="px-4 py-3 text-left">Streak</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-500 mx-auto" />
                </td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-600">
                  No members found. Click &quot;Add Member&quot; to get started!
                </td></tr>
              ) : members.map(m => {
                const ps = getPaymentStatus(m);
                const muted = isMuted(m);
                const reminderTag = m.customReminderDays?.length > 0
                  ? `Custom: ${m.customReminderDays.join(',')}`
                  : 'Default (1,3,7)';
                const isSelected = selectedIds.has(m._id);

                return (
                  <tr key={m._id} className={`transition-colors ${isSelected ? 'bg-brand-500/5' : 'hover:bg-gray-800/50'}`}>
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelect(m._id)} />
                    </td>
                    {/* Name + phone + mute badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-white">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.phone}</p>
                        </div>
                        {muted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20" title={`Muted until ${new Date(m.mutedUntil!).toLocaleDateString('en-IN')}`}>
                            <BellOff size={10} /> Muted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{m.planType}</td>
                    <td className="px-4 py-3 text-gray-300 font-medium">₹{m.monthlyAmount}</td>
                    {/* Member status badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'active' ? 'bg-green-500/10 text-green-400' : m.status === 'frozen' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                        {m.status}
                      </span>
                    </td>
                    {/* Payment status badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>
                        {ps.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(m.endDate).toLocaleDateString('en-IN')}</td>
                    {/* Reminder pattern */}
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{reminderTag}</span>
                    </td>
                    {/* Streak */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{(m.currentStreak || 0) >= 7 ? '🔥🔥' : (m.currentStreak || 0) >= 3 ? '🔥' : '💪'}</span>
                        <span className="text-sm font-bold text-white">{m.currentStreak || 0}</span>
                        {(m.longestStreak || 0) > (m.currentStreak || 0) && (
                          <span className="text-[9px] text-gray-600">(best: {m.longestStreak})</span>
                        )}
                      </div>
                    </td>
                    {/* Actions dropdown */}
                    <td className="px-4 py-3 text-right">
                      <button onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setDropdownPos({ x: rect.right - 208, y: rect.bottom + 4 });
                        setActiveDropdown(activeDropdown === m._id ? null : m._id);
                      }}
                        className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800">
                        <MoreVertical size={16} />
                      </button>
                      {activeDropdown === m._id && (
                        <div style={{ position: 'fixed', left: dropdownPos.x, top: Math.min(dropdownPos.y, window.innerHeight - 340), zIndex: 9999 }}
                          className="w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1">
                          <button onClick={() => { setShowPaymentModal(m); setPayForm({ amount: '', note: '' }); setActiveDropdown(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                            <CreditCard size={14} /> Record Payment
                          </button>
                          {/* Show "Mark Full Payment" only when there's outstanding balance */}
                          {m.outstandingBalance > 0 && (
                            <button onClick={() => { handleFullPayment(m); setActiveDropdown(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-400 hover:bg-gray-700">
                              <CheckCircle2 size={14} /> Mark Full Payment
                            </button>
                          )}
                          <button onClick={() => { setShowMuteModal(m); setMuteForm({ mutedUntil: '', note: '', indefinite: false }); setActiveDropdown(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                            {isMuted(m) ? <Bell size={14} /> : <BellOff size={14} />}
                            {isMuted(m) ? 'Unmute' : 'Mute Reminders'}
                          </button>
                          <button onClick={() => { setShowDueDateModal(m); setDueDateForm({ endDate: m.endDate.split('T')[0], note: '' }); setActiveDropdown(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                            <CalendarClock size={14} /> Change Due Date
                          </button>
                          <button onClick={() => { setShowNoteModal(m); setNoteText(''); setActiveDropdown(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                            <StickyNote size={14} /> Add Note
                          </button>
                          <button onClick={() => { setShowHistoryModal(m); setActiveDropdown(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                            <StickyNote size={14} /> View History
                          </button>
                          <div className="border-t border-gray-700 my-1" />
                          <button onClick={() => { handleDelete(m._id); setActiveDropdown(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Card View ─────────────────────────────────────── */}
        <div className="lg:hidden divide-y divide-gray-800">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-500" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-gray-600 text-sm">No members found.</div>
          ) : members.map(m => {
            const ps = getPaymentStatus(m);
            const muted = isMuted(m);
            const isExpanded = expandedMembers.has(m._id);
            return (
              <article key={m._id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Checkbox checked={selectedIds.has(m._id)} onChange={() => toggleSelect(m._id)} />
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.phone}</p>
                    </div>
                    {muted && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400"><BellOff size={10} /></span>
                    )}
                  </div>
                  <button onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setDropdownPos({ x: Math.min(rect.right - 208, window.innerWidth - 220), y: rect.bottom + 4 });
                    setActiveDropdown(activeDropdown === m._id ? null : m._id);
                  }} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <MoreVertical size={16} />
                  </button>
                </div>
                
                <div className="flex justify-start items-center -mb-1 mt-1">
                  <button 
                    onClick={() => toggleMember(m._id)} 
                    className="text-[11px] font-semibold text-brand-400 flex items-center gap-1 bg-brand-500/10 px-2 py-1 rounded-md"
                  >
                    {isExpanded ? 'Hide Details' : 'Show Details'}
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm bg-gray-900/50 p-3 rounded-lg border border-gray-800 mt-2 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-500/30" />
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-0.5">Plan</span>
                      <p className="text-gray-300 text-xs">{m.planType}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-0.5">Fee</span>
                      <p className="text-gray-300 text-xs font-medium">₹{m.monthlyAmount}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-0.5">Status</span>
                      <p><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${m.status === 'active' ? 'bg-green-500/10 text-green-400' : m.status === 'frozen' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{m.status}</span></p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-0.5">Payment</span>
                      <p><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${ps.color}`}>{ps.label}</span></p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-0.5">Expires</span>
                      <p className="text-gray-400 text-xs">{new Date(m.endDate).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-0.5">Streak</span>
                      <p className="flex items-center gap-1 text-xs">
                        <span>{(m.currentStreak || 0) >= 7 ? '🔥🔥' : (m.currentStreak || 0) >= 3 ? '🔥' : '💪'}</span>
                        <span className="font-bold text-white">{m.currentStreak || 0}</span>
                      </p>
                    </div>
                  </div>
                )}

                {activeDropdown === m._id && (
                  <div style={{ position: 'fixed', left: Math.min(dropdownPos.x, window.innerWidth - 220), top: Math.min(dropdownPos.y, window.innerHeight - 340), zIndex: 9999 }}
                    className="w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1">
                    <button onClick={() => { setShowPaymentModal(m); setPayForm({ amount: '', note: '' }); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                      <CreditCard size={14} /> Record Payment
                    </button>
                    {m.outstandingBalance > 0 && (
                      <button onClick={() => { handleFullPayment(m); setActiveDropdown(null); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-400 hover:bg-gray-700">
                        <CheckCircle2 size={14} /> Mark Full Payment
                      </button>
                    )}
                    <button onClick={() => { setShowMuteModal(m); setMuteForm({ mutedUntil: '', note: '', indefinite: false }); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                      {isMuted(m) ? <Bell size={14} /> : <BellOff size={14} />}
                      {isMuted(m) ? 'Unmute' : 'Mute Reminders'}
                    </button>
                    <button onClick={() => { setShowDueDateModal(m); setDueDateForm({ endDate: m.endDate.split('T')[0], note: '' }); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                      <CalendarClock size={14} /> Change Due Date
                    </button>
                    <div className="border-t border-gray-700 my-1" />
                    <button onClick={() => { handleDelete(m._id); setActiveDropdown(null); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* ── Pagination ──────────────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} members
            </p>
            <div className="flex items-center gap-1">
              <button disabled={pagination.page <= 1} onClick={() => fetchMembers(pagination.page - 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchMembers(pagination.page + 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODALS
      ═════════════════════════════════════════════════════════════════ */}

      {/* ── Custom Confirm Dialog ─────────────────────────────────── */}
      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        confirmColor={confirmDialog?.confirmColor}
        icon={confirmDialog?.icon}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* ── Add Member Modal ──────────────────────────────────────── */}
      {showAddModal && (
        <Modal title="Add New Member" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4" noValidate>
            <div>
              <label className={labelClass}>Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" maxLength={10} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={inputClass} placeholder="9876543210" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Plan Type</label>
                <Dropdown 
                  value={form.planType} 
                  onChange={pType => {
                    const dMonths = pType === 'Annual' ? 12 : pType === 'Half-Yearly' ? 6 : pType === 'Quarterly' ? 3 : 1;
                    setForm({ ...form, planType: pType, durationMonths: dMonths });
                  }}
                  options={[
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Quarterly', label: 'Quarterly' },
                    { value: 'Half-Yearly', label: 'Half-Yearly' },
                    { value: 'Annual', label: 'Annual' },
                  ]}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Duration (Months)</label>
                <NumberInput min={1} step={1} value={form.durationMonths} onChange={(val: number) => setForm({ ...form, durationMonths: val })} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Monthly Fee (₹) <span className="text-red-400">*</span></label>
              <NumberInput min={1} step={100} value={form.monthlyAmount} onChange={(val: number | string) => setForm({ ...form, monthlyAmount: val.toString() })} placeholder="e.g. 999, 1500, 2999" />
            </div>
            <div>
              <label className={labelClass}>Note (optional)</label>
              <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} className={`${inputClass} resize-none`} placeholder="Any special instructions..." />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button type="button" onClick={() => setShowAddModal(false)} className={btnGhost}>Cancel</button>
              <button type="submit" className={btnPrimary}>Save Member</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Mute Modal ────────────────────────────────────────────── */}
      {showMuteModal && (
        <Modal title={isMuted(showMuteModal) ? `Unmute ${showMuteModal.name}` : `Mute ${showMuteModal.name}`} onClose={() => setShowMuteModal(null)}>
          <form onSubmit={handleMute} className="space-y-4">
            {isMuted(showMuteModal) ? (
              <p className="text-sm text-gray-400">Currently muted until {new Date(showMuteModal.mutedUntil!).toLocaleDateString('en-IN')}. Click unmute to resume reminders.</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={muteForm.indefinite} onChange={e => setMuteForm({ ...muteForm, indefinite: e.target.checked })}
                    className="rounded border-gray-700 bg-gray-800 text-brand-500" />
                  <label className="text-sm text-gray-300">Until further notice</label>
                </div>
                {!muteForm.indefinite && (
                  <div>
                    <label className={labelClass}>Mute Until</label>
                    <input type="date" value={muteForm.mutedUntil} onChange={e => setMuteForm({ ...muteForm, mutedUntil: e.target.value })} className={inputClass} />
                  </div>
                )}
              </>
            )}
            <div>
              <label className={labelClass}>Note (optional)</label>
              <input type="text" value={muteForm.note} onChange={e => setMuteForm({ ...muteForm, note: e.target.value })} className={inputClass} placeholder="e.g. Going on vacation" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowMuteModal(null)} className={btnGhost}>Cancel</button>
              <button type="submit" className={btnPrimary}>{isMuted(showMuteModal) ? 'Unmute' : 'Mute'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Record Payment Modal ──────────────────────────────────── */}
      {showPaymentModal && (() => {
        const totalDue = showPaymentModal.outstandingBalance;
        const payAmount = Number(payForm.amount) || 0;
        const remaining = Math.max(0, totalDue - payAmount);
        const isFullPay = payAmount >= totalDue && totalDue > 0;
        const isOverpay = payAmount > totalDue && totalDue > 0;
        const progressPct = totalDue > 0 ? Math.min(100, (payAmount / totalDue) * 100) : 0;

        return (
          <Modal title={`Record Payment — ${showPaymentModal.name}`} onClose={() => setShowPaymentModal(null)}>
            {/* Summary Card */}
            <div className="mb-5 rounded-xl border border-gray-700 bg-gray-800/50 overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Monthly Fee</span>
                  <span className="text-gray-300 font-medium">₹{showPaymentModal.monthlyAmount}</span>
                </div>
                {showPaymentModal.outstandingBalance > showPaymentModal.monthlyAmount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-400">Carried Forward</span>
                    <span className="text-amber-400 font-medium">₹{showPaymentModal.outstandingBalance - showPaymentModal.monthlyAmount}</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-2 flex justify-between text-sm">
                  <span className="text-white font-bold">Total Outstanding</span>
                  <span className="text-white font-bold text-lg">₹{totalDue}</span>
                </div>
              </div>
              {/* Progress bar */}
              {payAmount > 0 && (
                <div className="px-4 pb-3">
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isFullPay ? 'bg-green-500' : 'bg-brand-500'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-gray-500">Paying: ₹{payAmount}</span>
                    <span className={`text-[10px] font-medium ${isFullPay ? 'text-green-400' : 'text-amber-400'}`}>
                      {isFullPay ? '✅ Fully Cleared' : `⚠️ ₹${remaining} remaining`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handlePayment} className="space-y-5">
              {/* Amount with Custom Stepper */}
              <div>
                <label className={labelClass}>Amount Received (₹)</label>
                <div className="flex border border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all bg-gray-800">
                  <button type="button"
                    onClick={() => setPayForm({ ...payForm, amount: String(Math.max(0, payAmount - showPaymentModal.monthlyAmount)) })}
                    className="bg-gray-800 border-r border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition w-12 shrink-0 flex items-center justify-center text-xl leading-none select-none"
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payForm.amount}
                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                    className="w-full bg-transparent border-0 px-3 py-3 text-lg text-white text-center font-bold focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                  <button type="button"
                    onClick={() => setPayForm({ ...payForm, amount: String(payAmount + showPaymentModal.monthlyAmount) })}
                    className="bg-gray-800 border-l border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition w-12 shrink-0 flex items-center justify-center text-xl leading-none select-none"
                  >+</button>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Steps of ₹{showPaymentModal.monthlyAmount} (monthly fee)</p>
              </div>

              {/* Quick Fill Buttons */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: '25%', val: Math.round(totalDue * 0.25) },
                  { label: '50%', val: Math.round(totalDue * 0.5) },
                  { label: '75%', val: Math.round(totalDue * 0.75) },
                  { label: 'Full', val: totalDue },
                ].map(btn => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => setPayForm({ ...payForm, amount: String(btn.val) })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      payAmount === btn.val
                        ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {btn.label} — ₹{btn.val}
                  </button>
                ))}
              </div>

              {/* Live Preview */}
              {payAmount > 0 && (
                <div className={`rounded-lg p-3 border text-sm ${
                  isFullPay
                    ? 'bg-green-500/5 border-green-500/20 text-green-400'
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                }`}>
                  {isOverpay ? (
                    <p>⚠️ Overpaying by ₹{payAmount - totalDue}. Balance will be cleared to ₹0.</p>
                  ) : isFullPay ? (
                    <p>✅ Full payment — balance cleared, plan extended by 30 days.</p>
                  ) : (
                    <p>💰 Partial payment — ₹{remaining} will remain outstanding.</p>
                  )}
                </div>
              )}

              {/* Note */}
              <div>
                <label className={labelClass}>Note (optional)</label>
                <input type="text" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} className={inputClass} placeholder="e.g. Cash, UPI, Card" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
                <button type="button" onClick={() => setShowPaymentModal(null)} className={btnGhost}>Cancel</button>
                <button type="submit" disabled={payAmount <= 0} className={`${btnPrimary} disabled:opacity-40`}>
                  {isFullPay ? '✅ Clear Balance' : `💰 Record ₹${payAmount || 0}`}
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* ── Due Date Modal ────────────────────────────────────────── */}
      {showDueDateModal && (
        <Modal title={`Change Due Date — ${showDueDateModal.name}`} onClose={() => setShowDueDateModal(null)}>
          <form onSubmit={handleDueDate} className="space-y-4">
            <div>
              <label className={labelClass}>New Due Date</label>
              <input type="date" required value={dueDateForm.endDate} onChange={e => setDueDateForm({ ...dueDateForm, endDate: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reason (optional)</label>
              <input type="text" value={dueDateForm.note} onChange={e => setDueDateForm({ ...dueDateForm, note: e.target.value })} className={inputClass} placeholder="e.g. Extended 1 week" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowDueDateModal(null)} className={btnGhost}>Cancel</button>
              <button type="submit" className={btnPrimary}>Update</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Add Note Modal ────────────────────────────────────────── */}
      {showNoteModal && (
        <Modal title={`Add Note — ${showNoteModal.name}`} onClose={() => setShowNoteModal(null)}>
          <form onSubmit={handleAddNote} className="space-y-4">
            <textarea required value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} className={inputClass} placeholder="Write a note..." />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowNoteModal(null)} className={btnGhost}>Cancel</button>
              <button type="submit" className={btnPrimary}>Save Note</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── History Modal ─────────────────────────────────────────── */}
      {showHistoryModal && (
        <Modal title={`History — ${showHistoryModal.name}`} onClose={() => setShowHistoryModal(null)}>
          {showHistoryModal.notes.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No notes recorded yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {[...showHistoryModal.notes].reverse().map(n => (
                <div key={n._id} className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-white">{n.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{n.context}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Close dropdown on outside click */}
      {activeDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
      )}
    </div>
  );
};

export default Members;
