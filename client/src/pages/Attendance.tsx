import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Attendance: React.FC = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const { data } = await api.get('/attendance');
      setAttendance(data.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Daily member check-ins</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="px-6 py-4 text-left">Date & Time</th>
                <th className="px-6 py-4 text-left">Member Name</th>
                <th className="px-6 py-4 text-left">Phone</th>
                <th className="px-6 py-4 text-left">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Loading attendance...
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No attendance records yet.
                  </td>
                </tr>
              ) : (
                attendance.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(a.date).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">{a.memberId?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-400">{a.memberId?.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                        {a.method === 'whatsapp-reply' ? '💬 WhatsApp' : '📸 QR Scan'}
                      </span>
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
