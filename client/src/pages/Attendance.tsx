import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  MapPin, Flame, Trophy, CalendarCheck, Users, Clock,
  ChevronDown, Filter, X, Search, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Live location check-ins & streak tracking</p>
        </div>

        {/* Manual Mark */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500/50 appearance-none max-w-[200px]"
          >
            <option value="">Select Member</option>
            {members.map((m: any) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={handleManualMark}
            disabled={marking || !selectedMemberId}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white transition-all"
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by member name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
            hasActiveFilters
              ? 'text-brand-400 bg-brand-500/10 border-brand-500/30'
              : 'text-gray-400 hover:text-white bg-gray-900 border-gray-800'
          }`}
        >
          <Filter size={16} /> Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-400" />}
        </button>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────── */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-brand-500/60 via-brand-400/30 to-transparent" />
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
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none ${
                      methodFilter ? 'bg-gray-800 border-2 border-brand-500/50' : 'bg-gray-800 border border-gray-700'
                    }`}
                  >
                    <option value="">All Methods</option>
                    <option value="whatsapp-location">📍 Location</option>
                    <option value="whatsapp-reply">💬 WhatsApp</option>
                    <option value="qr-scan">📸 QR Scan</option>
                    <option value="manual">✋ Manual</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none ${
                      statusFilter ? 'bg-gray-800 border-2 border-brand-500/50' : 'bg-gray-800 border border-gray-700'
                    }`}
                  >
                    <option value="">All Statuses</option>
                    <option value="success">✅ Inside Gym</option>
                    <option value="outside">❌ Outside</option>
                    <option value="manual">✋ Manual</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Records Table ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
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
      </div>
    </div>
  );
};

export default Attendance;
