import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  MapPin, Flame, Trophy, CalendarCheck, Users, Clock,
  ChevronDown, ChevronUp, Filter, X, Search, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import Dropdown from '../components/Dropdown';

// ─── Stats Card ──────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number;
  color: string; bg: string;
}> = ({ icon, label, value, color, bg }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bg} ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

// ─── Method badge ────────────────────────────────────────────────────
function MethodBadge({ method }: { method: string }) {
  const config: Record<string, { label: string; icon: string; color: string }> = {
    'whatsapp-location': { label: '📍 Location', icon: '📍', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    'whatsapp-reply': { label: '💬 WhatsApp', icon: '💬', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    'qr-scan': { label: '📸 QR Scan', icon: '📸', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    'manual': { label: '✋ Manual', icon: '✋', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  };
  const cfg = config[method] || config['manual'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Status badge ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'success') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/10 text-green-400">
      <CheckCircle2 size={11} /> Inside
    </span>
  );
  if (status === 'outside') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400">
      <XCircle size={11} /> Outside
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-500/10 text-gray-300">
      <CheckCircle2 size={11} /> Manual
    </span>
  );
}

// ─── Streak Badge ────────────────────────────────────────────────────
function StreakBadge({ streak, best }: { streak: number; best?: number }) {
  const emoji = streak >= 30 ? '👑' : streak >= 7 ? '🔥🔥' : streak >= 3 ? '🔥' : '💪';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{emoji}</span>
      <span className="text-sm font-bold text-white">{streak}</span>
      {best !== undefined && best > streak && (
        <span className="text-[10px] text-gray-500">(best: {best})</span>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────
const Attendance: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Manual mark
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [marking, setMarking] = useState(false);

  // Mobile layout state
  const [visibleMobileCount, setVisibleMobileCount] = useState(5);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  const toggleRecord = (id: string) => {
    const newSet = new Set(expandedRecords);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRecords(newSet);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (methodFilter) params.method = methodFilter;
      if (statusFilter) params.status = statusFilter;

      const [recordsRes, statsRes, membersRes] = await Promise.all([
        api.get('/attendance', { params }),
        api.get('/attendance/stats'),
        api.get('/members'),
      ]);
      setRecords(recordsRes.data.data);
      setStats(statsRes.data.data);
      setMembers(membersRes.data.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [methodFilter, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleManualMark = async () => {
    if (!selectedMemberId) return toast.error('Select a member');
    setMarking(true);
    try {
      await api.post('/attendance', { memberId: selectedMemberId, method: 'manual' });
      toast.success('Attendance marked!');
      setSelectedMemberId('');
      fetchAll();
    } catch {
      // Handled
    } finally {
      setMarking(false);
    }
  };

  const filteredRecords = searchTerm
    ? records.filter((a: any) => a.memberId?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    : records;

  const hasActiveFilters = methodFilter || statusFilter || searchTerm;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Live location check-ins & streak tracking</p>
        </div>

        {/* Manual Mark */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex-1 w-full md:w-[200px]">
            <Dropdown
              value={selectedMemberId}
              onChange={(val) => setSelectedMemberId(val)}
              options={[{ value: '', label: 'Select Member' }, ...members.map((m: any) => ({ value: m._id, label: m.name }))]}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 sm:py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500/50 min-h-[48px] sm:min-h-0"
            />
          </div>
          <button
            onClick={handleManualMark}
            disabled={marking || !selectedMemberId}
            className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white transition-all min-h-[48px] sm:min-h-0 whitespace-nowrap"
          >
            {marking ? '...' : '✋ Mark'}
          </button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<CalendarCheck size={20} />}
            label="Today's Check-ins"
            value={stats.todayCount}
            color="text-green-400"
            bg="bg-green-500/10"
          />
          <StatCard
            icon={<Clock size={20} />}
            label="This Week"
            value={stats.weekCount}
            color="text-blue-400"
            bg="bg-blue-500/10"
          />
          <StatCard
            icon={<MapPin size={20} />}
            label="Via Location"
            value={stats.methodBreakdown?.['whatsapp-location'] || 0}
            color="text-purple-400"
            bg="bg-purple-500/10"
          />
          <StatCard
            icon={<Users size={20} />}
            label="Total Records"
            value={records.length}
            color="text-amber-400"
            bg="bg-amber-500/10"
          />
        </div>
      )}

      {/* ── Streak Leaderboard ─────────────────────────────────── */}
      {stats?.topStreaks?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-orange-500/60 via-red-500/40 to-transparent" />
          <div className="p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Flame size={16} className="text-orange-400" /> Streak Leaderboard
            </h3>
            <div className="flex flex-wrap gap-3">
              {stats.topStreaks.map((m: any, i: number) => (
                <div
                  key={m._id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    i === 0
                      ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <span className="text-lg">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.name}</p>
                    <p className="text-[10px] text-gray-500">
                      🔥 {m.currentStreak} days · Best: {m.longestStreak}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Search + Filter Bar ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by member name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-3 sm:py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[48px] sm:min-h-0"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
            hasActiveFilters
              ? 'text-brand-400 bg-brand-500/10 border-brand-500/30'
              : 'text-gray-400 hover:text-white bg-gray-900 border-gray-800'
          } min-h-[48px] sm:min-h-0 w-full sm:w-auto justify-center`}
        >
          <Filter size={16} /> Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-400" />}
        </button>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────── */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 relative z-20">
          <div className="h-[2px] rounded-t-2xl bg-gradient-to-r from-brand-500/60 via-brand-400/30 to-transparent" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Filter size={14} className="text-brand-400" /> Filter Records
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => { setMethodFilter(''); setStatusFilter(''); setSearchTerm(''); }}
                  className="text-sm text-gray-400 hover:text-red-400 flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gray-700 hover:border-red-500/40 bg-gray-800 transition-all"
                >
                  <X size={14} /> Reset
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Method</label>
                <div className="relative">
                  <Dropdown
                    value={methodFilter}
                    onChange={(val) => setMethodFilter(val)}
                    options={[
                      { value: '', label: 'All Methods' },
                      { value: 'whatsapp-location', label: '📍 Location' },
                      { value: 'whatsapp-reply', label: '💬 WhatsApp' },
                      { value: 'qr-scan', label: '📸 QR Scan' },
                      { value: 'manual', label: '✋ Manual' },
                    ]}
                    className={`w-full bg-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500/40 min-h-[48px] sm:min-h-0 ${
                      methodFilter ? 'border-2 border-brand-500/50' : 'border border-gray-700'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Status</label>
                <div className="relative">
                  <Dropdown
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'success', label: '✅ Inside Gym' },
                      { value: 'outside', label: '❌ Outside' },
                      { value: 'manual', label: '✋ Manual' },
                    ]}
                    className={`w-full bg-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500/40 min-h-[48px] sm:min-h-0 ${
                      statusFilter ? 'border-2 border-brand-500/50' : 'border border-gray-700'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Records Table ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-2 relative z-10">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="px-5 py-4 text-left">Date & Time</th>
                <th className="px-5 py-4 text-left">Member</th>
                <th className="px-5 py-4 text-left">Method</th>
                <th className="px-5 py-4 text-left">Distance</th>
                <th className="px-5 py-4 text-left">Status</th>
                <th className="px-5 py-4 text-left">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-500" />
                      <p className="text-gray-500 text-sm mt-3">Loading attendance...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <CalendarCheck size={32} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500">No attendance records found</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((a: any) => (
                  <tr key={a._id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-4 text-gray-300 whitespace-nowrap">
                      {new Date(a.date).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">{a.memberId?.name || 'Unknown'}</p>
                      <p className="text-[11px] text-gray-500">{a.memberId?.phone || ''}</p>
                    </td>
                    <td className="px-5 py-4">
                      <MethodBadge method={a.method} />
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {a.distance_m != null ? (
                        <span className={`font-medium ${a.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                          {a.distance_m}m
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={a.status || 'success'} />
                    </td>
                    <td className="px-5 py-4">
                      {a.memberId?.currentStreak != null ? (
                        <StreakBadge streak={a.memberId.currentStreak} best={a.memberId.longestStreak} />
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Card View ─────────────────────────────────────── */}
        <div className="lg:hidden divide-y divide-gray-800/60">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-500" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarCheck size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">No attendance records found</p>
            </div>
          ) : (
            <>
              {filteredRecords.slice(0, visibleMobileCount).map((a: any) => {
                const isExpanded = expandedRecords.has(a._id);
                return (
                  <article key={a._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-4">
                        <p className="font-medium text-white truncate">{a.memberId?.name || 'Unknown'}</p>
                        <p className="text-[11px] text-gray-500">{a.memberId?.phone || ''}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-gray-400 text-[11px] font-medium leading-none">
                          {new Date(a.date).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-gray-500 text-[10px] leading-none">
                          {new Date(a.date).toLocaleString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center -mb-1 mt-1">
                      <StatusBadge status={a.status || 'success'} />
                      <button 
                        onClick={() => toggleRecord(a._id)} 
                        className="text-[11px] font-semibold text-brand-400 flex items-center gap-1 bg-brand-500/10 px-2 py-1 rounded-md"
                      >
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm bg-gray-900/50 p-3 rounded-lg border border-gray-800 mt-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-500/30" />
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-0.5">Method</span>
                          <MethodBadge method={a.method} />
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-0.5">Distance</span>
                          {a.distance_m != null ? (
                            <span className={`font-medium text-xs ${a.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{a.distance_m}m</span>
                          ) : <span className="text-gray-600 font-bold">—</span>}
                        </div>
                        <div className="col-span-2 pt-1 border-t border-gray-800/60">
                           <span className="text-gray-500 text-[10px] uppercase font-semibold block mb-1">Streak Progress</span>
                           {a.memberId?.currentStreak != null ? (
                              <StreakBadge streak={a.memberId.currentStreak} best={a.memberId.longestStreak} />
                            ) : (
                              <span className="text-gray-600 font-bold">—</span>
                            )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {visibleMobileCount < filteredRecords.length && (
                <div className="p-4 flex justify-center">
                  <button 
                    onClick={() => setVisibleMobileCount(prev => prev + 5)}
                    className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition-all border border-gray-700 hover:border-gray-600"
                  >
                    Load More ({filteredRecords.length - visibleMobileCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
