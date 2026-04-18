import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Dropdown from '../components/Dropdown';
import {
  Search, Clock, ChevronDown, X, Trash2, ChevronLeft, ChevronRight,
  UserPlus, UserMinus, CreditCard, XCircle, Bell, BellOff, CalendarClock,
  StickyNote, Send, AlertTriangle, CheckCircle2, Filter
} from 'lucide-react';

// ─── Action Config ───────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  member_added:      { label: 'Member Added',     icon: <UserPlus size={14} />,     color: 'text-green-400',  bgColor: 'bg-green-500/10' },
  member_deleted:    { label: 'Member Deleted',    icon: <UserMinus size={14} />,    color: 'text-red-400',    bgColor: 'bg-red-500/10' },
  payment_created:   { label: 'Payment Link Sent', icon: <Send size={14} />,         color: 'text-blue-400',   bgColor: 'bg-blue-500/10' },
  payment_received:  { label: 'Payment Received',  icon: <CheckCircle2 size={14} />, color: 'text-green-400',  bgColor: 'bg-green-500/10' },
  payment_cancelled: { label: 'Payment Cancelled', icon: <XCircle size={14} />,      color: 'text-amber-400',  bgColor: 'bg-amber-500/10' },
  payment_deleted:   { label: 'Payment Deleted',   icon: <Trash2 size={14} />,       color: 'text-red-400',    bgColor: 'bg-red-500/10' },
  mute_changed:      { label: 'Mute Changed',      icon: <BellOff size={14} />,      color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  due_date_changed:  { label: 'Due Date Changed',  icon: <CalendarClock size={14} />,color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  reminder_sent:     { label: 'Reminder Sent',     icon: <Bell size={14} />,         color: 'text-cyan-400',   bgColor: 'bg-cyan-500/10' },
  note_added:        { label: 'Note Added',        icon: <StickyNote size={14} />,   color: 'text-gray-400',   bgColor: 'bg-gray-500/10' },
};

const ACTION_OPTIONS = Object.entries(ACTION_CONFIG).map(([val, cfg]) => ({
  value: val,
  label: cfg.label,
}));

const RANGE_OPTIONS = [
  { value: '',     label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d',   label: 'Last 7 Days' },
  { value: '30d',  label: 'Last 30 Days' },
  { value: '90d',  label: 'Last 90 Days' },
];

// ─── Confirm Dialog ──────────────────────────────────────────────────
const ConfirmModal: React.FC<{
  open: boolean; title: string; message: string;
  confirmLabel?: string; confirmColor?: string;
  icon?: React.ReactNode;
  onConfirm: () => void; onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', confirmColor = 'bg-brand-500 hover:bg-brand-600', icon, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-800">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`${confirmColor} text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
const History: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [rangeFilter, setRangeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Confirm
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel?: string; confirmColor?: string;
    icon?: React.ReactNode; onConfirm: () => void;
  } | null>(null);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '30',
      };
      if (searchTerm) params.search = searchTerm;
      if (actionFilter) params.action = actionFilter;
      if (rangeFilter) params.range = rangeFilter;

      const { data } = await api.get('/activity', { params });
      setLogs(data.data);
      setPagination(data.pagination);
    } catch {
      // Handled globally
    } finally {
      setLoading(false);
    }
  }, [searchTerm, actionFilter, rangeFilter]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const handleClearAll = () => {
    setConfirmDialog({
      title: 'Clear All History',
      message: `This will permanently delete all ${pagination.total} activity log entries. This action cannot be undone.`,
      confirmLabel: 'Clear All',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      icon: <Trash2 className="text-red-400" size={24} />,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete('/activity');
          toast.success('Activity history cleared');
          fetchLogs(1);
        } catch {
          toast.error('Failed to clear history');
        }
      },
    });
  };

  const hasActiveFilters = searchTerm || actionFilter || rangeFilter;

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('');
    setRangeFilter('');
  };

  // Format relative time
  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 sm:py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all min-h-[48px] sm:min-h-0';

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Activity History</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pagination.total} total events
            {hasActiveFilters && <span className="text-brand-400"> · filtered</span>}
          </p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
          >
            <Trash2 size={14} /> Clear History
          </button>
        )}
      </div>

      {/* ── Search + Filter Bar ────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by member name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-3 sm:py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[48px] sm:min-h-0"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
            hasActiveFilters
              ? 'text-brand-400 bg-brand-500/10 border-brand-500/30'
              : 'text-gray-400 hover:text-white bg-gray-900 border-gray-800'
          }`}
        >
          <Filter size={16} /> Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-400" />}
        </button>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────────── */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 relative z-20">
          <div className="h-[2px] rounded-t-2xl bg-gradient-to-r from-brand-500/60 via-brand-400/30 to-transparent" />
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Filter size={14} className="text-brand-400" /> Filter Activity
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="text-sm text-gray-400 hover:text-red-400 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-700 hover:border-red-500/40 bg-gray-800 hover:bg-red-500/10 transition-all"
                >
                  <X size={14} /> Reset All
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-2 pl-1">Action Type</label>
                <Dropdown
                  value={actionFilter}
                  onChange={(val) => setActionFilter(val)}
                  options={[
                    { value: '', label: 'All Actions' },
                    ...ACTION_OPTIONS.map(o => ({ value: o.value, label: o.label }))
                  ]}
                  className={`w-full bg-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500/40 min-h-[48px] sm:min-h-0 ${
                    actionFilter ? 'border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]' : 'border border-gray-700 hover:border-gray-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-2 pl-1">Time Range</label>
                <Dropdown
                  value={rangeFilter}
                  onChange={(val) => setRangeFilter(val)}
                  options={RANGE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  className={`w-full bg-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500/40 min-h-[48px] sm:min-h-0 ${
                    rangeFilter ? 'border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]' : 'border border-gray-700 hover:border-gray-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Activity Timeline ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-4 relative z-10">
        {loading ? (
          <div className="p-12 flex flex-col items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-500" />
            <p className="text-gray-500 text-sm mt-3">Loading activity...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center opacity-60">
            <Clock size={36} className="text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500">No activity found</p>
            <p className="text-xs text-gray-600 mt-1 max-w-sm">
              {hasActiveFilters
                ? 'Try clearing your filters or search term.'
                : 'Activity will appear here as you add members, record payments, and manage your gym.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {logs.map((log: any) => {
              const cfg = ACTION_CONFIG[log.action] || {
                label: log.action,
                icon: <Clock size={14} />,
                color: 'text-gray-400',
                bgColor: 'bg-gray-500/10',
              };

              return (
                <div key={log._id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-800/50 transition-colors group">
                  {/* Icon */}
                  <div className={`mt-0.5 p-2 rounded-xl ${cfg.bgColor} ${cfg.color} shrink-0`}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {log.amount > 0 && (
                        <span className="text-xs font-semibold text-white bg-gray-800 px-2 py-0.5 rounded-md">
                          ₹{log.amount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white font-medium mt-0.5 truncate">
                      {log.memberName}
                    </p>
                    {log.note && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                        {log.note}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500 font-medium">{relativeTime(log.createdAt)}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 bg-gray-900/50">
            <p className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} events
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Dialog ────────────────────────────────────────── */}
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
    </div>
  );
};

export default History;
