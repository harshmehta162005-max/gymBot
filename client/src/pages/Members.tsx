import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Search, Plus, Trash2, MoreVertical, BellOff, Bell, CreditCard,
  CalendarClock, StickyNote, Send, ChevronLeft, ChevronRight,
  Filter, X, AlertTriangle, CheckCircle2, Check, ChevronDown
} from 'lucide-react';

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
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helper: Payment Status ──────────────────────────────────────────
function getPaymentStatus(m: Member) {
  if (m.outstandingBalance > 0 && new Date(m.endDate) < new Date())
    return { label: `Overdue ₹${m.outstandingBalance}`, color: 'bg-red-500/10 text-red-400' };
  if (m.outstandingBalance > 0)
    return { label: `Partial ₹${m.outstandingBalance} due`, color: 'bg-amber-500/10 text-amber-400' };
  return { label: 'Fully Paid', color: 'bg-green-500/10 text-green-400' };
}

function isMuted(m: Member) {
  return m.mutedUntil && new Date(m.mutedUntil) > new Date();
}

function hasOutstanding(m: Member) {
  return m.outstandingBalance > 0 || m.monthlyAmount > 0;
}

// ─── Input class (DRY) ──────────────────────────────────────────────
const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all';
const labelClass = 'block text-xs font-medium text-gray-400 mb-1.5';
const btnPrimary = 'bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors';
const btnGhost = 'px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors';

// ─── Modal Wrapper ───────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
    const totalDue = selectedMembers.reduce((sum, m) => sum + m.monthlyAmount + m.outstandingBalance, 0);
    const names = selectedMembers.map(m => m.name).join(', ');

    setConfirmDialog({
      title: 'Mark as Paid',
      message: `Record full payment of ₹${totalDue} for ${selectedMembers.length} member(s)?\n\n${names}`,
      confirmLabel: `Pay ₹${totalDue}`,
      confirmColor: 'bg-green-600 hover:bg-green-700',
      icon: <CheckCircle2 className="text-green-400" size={24} />,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          for (const m of selectedMembers) {
            const due = m.monthlyAmount + m.outstandingBalance;
            await api.post(`/members/${m._id}/partial-payment`, { amount: due, note: 'Full payment (batch)' });
          }
          toast.success(`${selectedMembers.length} payment(s) recorded`);
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
    const totalDue = m.monthlyAmount + m.outstandingBalance;
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
          <div className="flex items-center gap-2">
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
            <button onClick={() => setShowAddModal(true)} className={`flex items-center gap-2 ${btnPrimary}`}>
              <Plus size={16} /> Add Member
            </button>
          </div>
        </div>

        {/* ── Search + Filter + Batch Pay Bar ─────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text" placeholder="Search by name or phone..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <button onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white bg-gray-900 border border-gray-800">
            <Filter size={16} /> Filters
            {(filters.status || filters.payment || filters.muted) && (
              <span className="w-2 h-2 rounded-full bg-brand-400" />
            )}
          </button>
          {/* Batch Pay — inline with search & filter */}
          {selectedIds.size > 0 && (
            <button onClick={handleBatchPaid}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-green-900/30">
              <CreditCard size={16} /> Mark as Paid ({selectedIds.size})
            </button>
          )}
        </div>

        {/* ── Filter Panel ────────────────────────────────────────── */}
        {showFilterPanel && (
          <div className="mt-3 rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-brand-500/60 via-brand-400/30 to-transparent" />
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
                  <div className="relative">
                    <select value={filters.status}
                      onChange={e => setFilters({ ...filters, status: e.target.value })}
                      style={{ colorScheme: 'dark' }}
                      className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none ${
                        filters.status
                          ? 'bg-gray-800 border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]'
                          : 'bg-gray-800 border border-gray-700 hover:border-gray-500'
                      }`}>
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="frozen">Frozen</option>
                      <option value="expired">Expired</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-2 pl-1">Payment</label>
                  <div className="relative">
                    <select value={filters.payment}
                      onChange={e => setFilters({ ...filters, payment: e.target.value })}
                      style={{ colorScheme: 'dark' }}
                      className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none ${
                        filters.payment
                          ? 'bg-gray-800 border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]'
                          : 'bg-gray-800 border border-gray-700 hover:border-gray-500'
                      }`}>
                      <option value="">All Payments</option>
                      <option value="full">Fully Paid</option>
                      <option value="partial">Partial Due</option>
                      <option value="overdue">Overdue</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-2 pl-1">Alerts</label>
                  <div className="relative">
                    <select value={filters.muted}
                      onChange={e => setFilters({ ...filters, muted: e.target.value })}
                      style={{ colorScheme: 'dark' }}
                      className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none ${
                        filters.muted
                          ? 'bg-gray-800 border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]'
                          : 'bg-gray-800 border border-gray-700 hover:border-gray-500'
                      }`}>
                      <option value="">All Members</option>
                      <option value="true">Muted Only</option>
                      <option value="false">Not Muted</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-500 mx-auto" />
                </td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600">
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
                          {/* Show "Mark Full Payment" only when there's something to pay */}
                          {(m.outstandingBalance > 0 || m.monthlyAmount > 0) && (
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
                <div className="relative">
                  <select value={form.planType} onChange={e => {
                      const pType = e.target.value;
                      const dMonths = pType === 'Annual' ? 12 : pType === 'Half-Yearly' ? 6 : pType === 'Quarterly' ? 3 : 1;
                      setForm({ ...form, planType: pType, durationMonths: dMonths });
                    }} 
                    style={{ colorScheme: 'dark' }}
                    className={inputClass + ' appearance-none pl-4 pr-10 cursor-pointer'}>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Annual">Annual</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
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
      {showPaymentModal && (
        <Modal title={`Record Payment — ${showPaymentModal.name}`} onClose={() => setShowPaymentModal(null)}>
          <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
            <p className="text-gray-400">Monthly fee: <span className="text-white font-medium">₹{showPaymentModal.monthlyAmount}</span></p>
            {showPaymentModal.outstandingBalance > 0 && (
              <p className="text-amber-400">Outstanding: ₹{showPaymentModal.outstandingBalance}</p>
            )}
            <p className="text-gray-400 mt-1">Total due: <span className="text-white font-bold">₹{showPaymentModal.monthlyAmount + showPaymentModal.outstandingBalance}</span></p>
          </div>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className={labelClass}>Amount Received (₹)</label>
              <input type="number" min="1" required value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Note (optional)</label>
              <input type="text" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} className={inputClass} placeholder="e.g. Cash, UPI, Card" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowPaymentModal(null)} className={btnGhost}>Cancel</button>
              <button type="submit" className={btnPrimary}>Save Payment</button>
            </div>
          </form>
        </Modal>
      )}

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
