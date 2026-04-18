import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Download, FileText } from 'lucide-react';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const downloadCSV = async (type: 'members' | 'payments' | 'attendance') => {
    setLoading(true);
    try {
      // 1. Fetch all data for the requested entity
      const { data } = await api.get(`/${type}`);
      const items = data.data;

      if (!items || items.length === 0) {
        toast.error(`No ${type} data available to export.`);
        setLoading(false);
        return;
      }

      // 2. Format to CSV
      const headers = Object.keys(items[0]).filter(k => k !== '__v'); // omit mongoose internal
      const rows = items.map((item: any) =>
        headers.map(header => {
          let val = item[header];
          // Simple object flattening for objects like memberId
          if (val && typeof val === 'object') {
            val = val.name || val._id || JSON.stringify(val);
          }
          // Escape quotes and commas
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      );

      const csvContent = [headers.join(','), ...rows].join('\n');

      // 3. Trigger Blob Download in Browser
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${type} exported successfully`);
    } catch {
      // API error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Export your data to CSV</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { type: 'members', title: 'Members Data', desc: 'Full member roster with expiration dates and contact info.' },
          { type: 'payments', title: 'Payments Log', desc: 'All payment links, status, and transaction timestamps.' },
          { type: 'attendance', title: 'Attendance Log', desc: 'Detailed log of all QR and WhatsApp check-ins.' },
        ].map(module => (
          <div key={module.type} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{module.title}</h3>
            <p className="text-sm text-gray-400 mb-6 flex-1">
              {module.desc}
            </p>
            <button
              onClick={() => downloadCSV(module.type as any)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
