import React, { useEffect, useState } from 'react';
import { Users, CreditCard, CalendarCheck, AlertTriangle, IndianRupee } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0, active: 0, dueThisWeek: 0, withBalance: 0, totalOutstanding: 0,
  });
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [paidThisMonth, setPaidThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, membersRes, paymentsRes] = await Promise.all([
        api.get('/members/stats'),
        api.get('/members?limit=5&sort=createdAt&order=desc'),
        api.get('/payments'),
      ]);

      setStats(statsRes.data.data);
      setRecentMembers(membersRes.data.data || []);

      const payments = paymentsRes.data.data || [];
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      setPaidThisMonth(
        payments.filter((p: any) => p.status === 'paid' && new Date(p.paidAt) >= monthStart).length
      );
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500" />
      </div>
    );
  }

  return (
    <section className="space-y-6 lg:space-y-8" aria-label="Dashboard">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your gym</p>
      </div>

      {/* Stats Grid — 2 cols mobile, 3 cols tablet, 5 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatsCard title="Total Members" value={stats.total} icon={Users} color="brand" />
        <StatsCard title="Active" value={stats.active} icon={CalendarCheck} color="blue" />
        <StatsCard title="Due This Week" value={stats.dueThisWeek} icon={AlertTriangle} color="amber" />
        <StatsCard title="Paid This Month" value={paidThisMonth} icon={CreditCard} color="brand" />
        <StatsCard
          title="Outstanding"
          value={stats.totalOutstanding > 0 ? `₹${stats.totalOutstanding}` : '₹0'}
          icon={IndianRupee}
          color={stats.totalOutstanding > 0 ? 'rose' : 'brand'}
        />
      </div>

      {/* Recent Members — Table on desktop, Stacked cards on mobile */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Recent Members</h2>
        </div>

        {/* Desktop table (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-left">Fee</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Balance</th>
                <th className="px-6 py-3 text-left">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentMembers.map((m: any) => (
                <tr key={m._id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{m.name}</td>
                  <td className="px-6 py-4 text-gray-400">{m.phone}</td>
                  <td className="px-6 py-4 text-gray-300">₹{m.monthlyAmount}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.status === 'active' ? 'bg-green-500/10 text-green-400' : m.status === 'frozen' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {m.outstandingBalance > 0
                      ? <span className="text-amber-400 font-medium">₹{m.outstandingBalance}</span>
                      : <span className="text-green-400">Clear</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{new Date(m.endDate).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {recentMembers.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-600">No members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards (hidden on desktop) */}
        <div className="md:hidden divide-y divide-gray-800">
          {recentMembers.map((m: any) => (
            <article key={m._id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white text-sm">{m.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${m.status === 'active' ? 'bg-green-500/10 text-green-400' : m.status === 'frozen' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                  {m.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Phone</span>
                  <p className="text-gray-300">{m.phone}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Fee</span>
                  <p className="text-gray-300">₹{m.monthlyAmount}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Balance</span>
                  <p>{m.outstandingBalance > 0
                    ? <span className="text-amber-400 font-medium">₹{m.outstandingBalance}</span>
                    : <span className="text-green-400">Clear</span>}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Expires</span>
                  <p className="text-gray-300">{new Date(m.endDate).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </article>
          ))}
          {recentMembers.length === 0 && (
            <div className="p-8 text-center text-gray-600">No members yet.</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
