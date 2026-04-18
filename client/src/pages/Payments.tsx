import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ExternalLink, IndianRupee, Search, ChevronDown, CheckCircle2, AlertTriangle, Link as LinkIcon, X, MoreVertical, RefreshCw, Trash2, XCircle, Send } from 'lucide-react';

// ─── Modal Layout ────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-brand-500/80 to-transparent" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  </div>
);

// ─── Confirm Modal ───────────────────────────────────────────────────
const ConfirmModal: React.FC<{
  open: boolean; title: string; message: string;
  confirmLabel?: string; confirmColor?: string;
  icon?: React.ReactNode;
  onConfirm: () => void; onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', confirmColor = 'bg-brand-500 hover:bg-brand-600', icon, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4 mb-4">
          {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-800">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors ${confirmColor}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

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

// ─── Plan presets ────────────────────────────────────────────────────
const PLAN_PRESETS = [
  { label: 'Monthly', months: 1 },
  { label: 'Quarterly', months: 3 },
  { label: 'Half-Yearly', months: 6 },
  { label: 'Yearly', months: 12 },
];

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form
  const [selectedMember, setSelectedMember] = useState('');
  const [planPreset, setPlanPreset] = useState('Monthly');
  const [months, setMonths] = useState<number>(1);
  const [amount, setAmount] = useState<number | string>('');
  const [sending, setSending] = useState(false);

  // Action dropdown
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel?: string; confirmColor?: string;
    icon?: React.ReactNode; onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [payRes, memRes] = await Promise.all([
        api.get('/payments'),
        api.get('/members'),
      ]);
      setPayments(payRes.data.data);
      setMembers(memRes.data.data?.length ? memRes.data.data : memRes.data.data);
    } catch {
      // Handled globally
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate amount when member or months change
  const selectedMemberObj = useMemo(() => members.find((m: any) => m._id === selectedMember), [members, selectedMember]);

  useEffect(() => {
    if (selectedMemberObj) {
      setAmount(selectedMemberObj.monthlyAmount * months);
    }
  }, [selectedMemberObj, months]);

  // When plan preset changes, update months
  const handlePresetChange = (preset: string) => {
    setPlanPreset(preset);
    const found = PLAN_PRESETS.find(p => p.label === preset);
    if (found) setMonths(found.months);
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return toast.error('Please select a member.');
    if (!amount || Number(amount) <= 0) return toast.error('Amount must be greater than 0.');

    setSending(true);
    try {
      await api.post('/payments', {
        memberId: selectedMember,
        amount: Number(amount),
        description: `${planPreset} plan (${months} month${months > 1 ? 's' : ''}) for ${selectedMemberObj?.name}`,
      });
      toast.success('Payment link generated & sent via WhatsApp');
      setShowModal(false);
      setSelectedMember('');
      setAmount('');
      setMonths(1);
      setPlanPreset('Monthly');
      fetchData();
    } catch {
      // Handled globally
    } finally {
      setSending(false);
    }
  };

  // ── Payment Actions ───────────────────────────────────────────────
  const handleResend = async (payment: any) => {
    try {
      await api.post(`/payments/${payment._id}/resend`);
      toast.success('Payment link resent via WhatsApp');
    } catch {
      toast.error('Failed to resend');
    }
    setActiveAction(null);
  };

  const handleCancelPayment = (payment: any) => {
    setConfirmDialog({
      title: 'Cancel Payment',
      message: `Cancel the ₹${payment.amount} payment link for ${payment.memberId?.name || 'this member'}?`,
      confirmLabel: 'Cancel Link',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
      icon: <XCircle className="text-amber-400" size={24} />,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.put(`/payments/${payment._id}/cancel`);
          toast.success('Payment link cancelled');
          fetchData();
        } catch {
          toast.error('Failed to cancel');
        }
      },
    });
    setActiveAction(null);
  };

  const handleDeletePayment = (payment: any) => {
    setConfirmDialog({
      title: 'Delete Payment',
      message: `Permanently delete this ₹${payment.amount} payment record for ${payment.memberId?.name || 'this member'}?`,
      confirmLabel: 'Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      icon: <Trash2 className="text-red-400" size={24} />,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/payments/${payment._id}`);
          toast.success('Payment record deleted');
          fetchData();
        } catch {
          toast.error('Failed to delete');
        }
      },
    });
    setActiveAction(null);
  };

  // Local filtering logic
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const memberName = p.memberId?.name?.toLowerCase() || '';
      const memberPhone = p.memberId?.phone || '';
      
      const searchMatch = memberName.includes(searchQuery.toLowerCase()) || memberPhone.includes(searchQuery);
      const statusMatch = statusFilter ? p.status === statusFilter : true;
      return searchMatch && statusMatch;
    });
  }, [payments, searchQuery, statusFilter]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = () => setActiveAction(null);
    if (activeAction) window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [activeAction]);

  // Premium utility classes
  const inputClass = "w-full bg-gray-800 border-2 border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder-gray-500";
  const labelClass = "block text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2";
  const btnGhost = "px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors";
  const btnPrimary = "bg-brand-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-400 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payments</h1>
          <p className="text-gray-400 text-sm mt-1">Track collections and trigger Razorpay UPI Links</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 hover:-translate-y-0.5 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-brand-500/20"
        >
          <IndianRupee size={16} strokeWidth={2.5} /> Generate Payment Link
        </button>
      </div>

      {/* ── Desktop Toolbar ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by member name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border-2 border-gray-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 focus:bg-gray-800 transition-all shadow-sm"
          />
        </div>
        <div className="relative flex-1 max-w-[200px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none ${
              statusFilter
                ? 'bg-gray-800 border-2 border-brand-500/50 shadow-[0_0_12px_rgba(57,255,20,0.06)]'
                : 'bg-gray-900 border-2 border-gray-800 hover:border-gray-700'
            }`}
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-gray-500 font-bold uppercase tracking-wider border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-4 text-left">Member</th>
                <th className="px-6 py-4 text-left">Amount</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Link</th>
                <th className="px-6 py-4 text-left">Generated On</th>
                <th className="px-6 py-4 text-left">Paid At</th>
                <th className="px-4 py-4 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                       <span className="animate-pulse">Loading secure payments...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center opacity-60">
                      <LinkIcon size={32} className="mb-3 text-gray-600" />
                      <p className="text-sm font-medium">No payment links found</p>
                      <p className="text-xs mt-1 max-w-sm">
                         {searchQuery || statusFilter ? "Try clearing your filters or search constraints." : "Generate your first UPI link by clicking the green button above. It will be sent via WhatsApp immediately."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-800/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white tracking-wide text-nowrap">{p.memberId?.name || 'Deleted Member'}</div>
                      <div className="text-xs text-gray-500 font-medium tracking-wide mt-0.5">{p.memberId?.phone || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase shadow-sm ${
                          p.status === 'paid'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : p.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.razorpayLinkUrl ? (
                        <a
                          href={p.razorpayLinkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-400 hover:text-brand-300 flex items-center gap-1.5 font-medium transition-colors opacity-80 hover:opacity-100"
                        >
                          Open <ExternalLink size={13} strokeWidth={2.5} />
                        </a>
                      ) : (
                        <span className="text-gray-500 font-medium flex items-center gap-1.5 opacity-60">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs font-medium tracking-wide">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs font-medium tracking-wide">
                      {p.paidAt ? (
                        <div className="flex items-center gap-1.5 text-green-400">
                          <CheckCircle2 size={13} strokeWidth={3} />
                          {new Date(p.paidAt).toLocaleDateString('en-IN')}
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    {/* ── Actions ─────────────────────────────────── */}
                    <td className="px-4 py-4 text-center relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveAction(activeAction === p._id ? null : p._id); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-all"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeAction === p._id && (
                        <div className="absolute right-4 top-12 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1.5 min-w-[160px]" onClick={e => e.stopPropagation()}>
                          {p.status === 'pending' && (
                            <>
                              <button onClick={() => handleResend(p)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-left">
                                <Send size={14} /> Resend
                              </button>
                              <button onClick={() => handleCancelPayment(p)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-gray-700 transition-colors text-left">
                                <XCircle size={14} /> Cancel
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDeletePayment(p)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors text-left">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Generate Link Modal ─────────────────────────────────────── */}
      {showModal && (
        <Modal title="Generate Payment Link" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreateLink} className="space-y-5" noValidate>
            
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-3 flex gap-3 text-brand-400 items-start">
               <AlertTriangle size={16} className="shrink-0 mt-0.5" />
               <p className="text-[11px] leading-relaxed">
                 A Razorpay payment link will be generated and sent via WhatsApp to the member.
               </p>
            </div>

            {/* Member Select */}
            <div>
              <label className={labelClass}>Select Member</label>
              <div className="relative">
                <select
                  required
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className={inputClass + ' appearance-none cursor-pointer pr-10 text-white font-medium'}
                >
                  <option value="" className="text-gray-500">Pick a member...</option>
                  {members.map((m: any) => (
                    <option key={m._id} value={m._id}>{m.name} ({m.phone}) — ₹{m.monthlyAmount}/mo</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Plan Type Preset */}
            <div>
              <label className={labelClass}>Plan Duration</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PLAN_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handlePresetChange(p.label)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      planPreset === p.label
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40 shadow-[0_0_10px_rgba(57,255,20,0.08)]'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1.5">Months</label>
                <NumberInput min={1} step={1} value={months} onChange={(v: number) => setMonths(Math.max(1, v))} placeholder="1" />
              </div>
            </div>
            
            {/* Amount */}
            <div>
              <label className={labelClass}>Total Amount (₹)</label>
              <NumberInput min={50} step={100} value={amount} onChange={(val: number | string) => setAmount(val)} placeholder="Auto-calculated" />
              {selectedMemberObj && (
                <p className="text-[10px] text-gray-500 mt-1.5">
                  ₹{selectedMemberObj.monthlyAmount}/mo × {months} month{months > 1 ? 's' : ''} = <span className="text-brand-400 font-bold">₹{selectedMemberObj.monthlyAmount * months}</span>
                  {Number(amount) !== selectedMemberObj.monthlyAmount * months && <span className="text-amber-400 ml-1">(custom)</span>}
                </p>
              )}
            </div>
            
            <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className={btnPrimary}
              >
                {sending ? 'Sending...' : 'Send WhatsApp Link'}
              </button>
            </div>
          </form>
        </Modal>
      )}

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

export default Payments;
