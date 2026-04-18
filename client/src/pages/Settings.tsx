import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon, MapPin, Loader2, Save, Building2, Phone, Mail, User,
  Clock, CreditCard, Bell, Shield, Eye, EyeOff, MessageSquare,
  Navigation, CircleDot, Flame, CheckCircle2, AlertTriangle, ChevronDown, RotateCcw,
  Plus, Trash2
} from 'lucide-react';
import Dropdown from '../components/Dropdown';

// ─── Shared Styles ────────────────────────────────────────────────────
const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 sm:py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all min-h-[48px] sm:min-h-0';
const labelClass = 'block text-xs sm:text-xs font-medium text-gray-400 mb-1.5';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Custom Time Picker ───────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const TimePicker: React.FC<{
  value: string; onChange: (v: string) => void; label?: string;
}> = ({ value, onChange, label }) => {
  const [h, m] = (value || '08:00').split(':');
  const [open, setOpen] = useState(false);

  const setTime = (hour: string, minute: string) => {
    onChange(`${hour}:${minute}`);
    setOpen(false);
  };

  const hourNum = parseInt(h);
  const suffix = hourNum >= 12 ? 'PM' : 'AM';
  const display12 = `${hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum}:${m || '00'} ${suffix}`;

  return (
    <div className="relative">
      {label && <label className={labelClass}>{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
      >
        <span className="flex items-center gap-2">
          <Clock size={14} className="text-brand-400" />
          {display12}
        </span>
        <ChevronDown size={14} className="text-gray-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-xl shadow-black/40 overflow-hidden">
            <div className="grid grid-cols-2 max-h-52 overflow-y-auto custom-scrollbar">
              <div className="border-r border-gray-700">
                <p className="text-[10px] font-bold text-gray-500 px-3 py-1.5 bg-gray-900 sticky top-0">HOUR</p>
                {HOURS.map(hr => (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => setTime(hr, m || '00')}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      hr === h ? 'bg-brand-500/20 text-brand-400 font-bold' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {parseInt(hr) === 0 ? '12 AM' : parseInt(hr) < 12 ? `${parseInt(hr)} AM` : parseInt(hr) === 12 ? '12 PM' : `${parseInt(hr) - 12} PM`}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 px-3 py-1.5 bg-gray-900 sticky top-0">MIN</p>
                {MINUTES.map(mn => (
                  <button
                    key={mn}
                    type="button"
                    onClick={() => setTime(h || '08', mn)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      mn === (m || '00') ? 'bg-brand-500/20 text-brand-400 font-bold' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    :{mn}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────
const Section: React.FC<{
  title: string; description: string; icon: React.ReactNode;
  accentColor?: string; children: React.ReactNode;
}> = ({ title, description, icon, accentColor = 'from-brand-500/60 via-brand-400/30', children }) => (
  <div className="relative rounded-2xl border border-gray-800 bg-gray-900 focus-within:z-[60]">
    <div className={`h-[2px] rounded-t-2xl bg-gradient-to-r ${accentColor} to-transparent`} />
    <div className="p-4 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-gray-800 text-brand-400 shrink-0">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-white">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  </div>
);

// ─── Toggle Switch ────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({
  checked, onChange, label, description,
}) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm text-white font-medium">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${checked ? 'bg-brand-500' : 'bg-gray-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [dirty, setDirty] = useState(false);

  // Password
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Location
  const [locating, setLocating] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/owner/settings');
      setSettings(data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const update = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/owner/settings', settings);
      setSettings(data.data);
      setDirty(false);
      if (data.ownerSlim) {
        localStorage.setItem('gw_owner', JSON.stringify(data.ownerSlim));
      }
      toast.success('Settings saved!');
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('gymLat', parseFloat(pos.coords.latitude.toFixed(6)));
        update('gymLon', parseFloat(pos.coords.longitude.toFixed(6)));
        toast.success('📍 Location captured!');
        setLocating(false);
      },
      (err) => { toast.error(`Location error: ${err.message}`); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setChangingPw(true);
    try {
      await api.put('/owner/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {} finally { setChangingPw(false); }
  };

  const toggleDay = (day: number) => {
    const days = settings.businessDays || [];
    update('businessDays', days.includes(day) ? days.filter((d: number) => d !== day) : [...days, day].sort());
  };

  const toggleMethod = (method: string) => {
    const methods = settings.attendanceMethods || [];
    update('attendanceMethods', methods.includes(method) ? methods.filter((m: string) => m !== method) : [...methods, method]);
  };

  // ─── Multi-Shift helpers ─────────────────────────────────────────
  const addShift = () => {
    const shifts = settings.businessShifts || [];
    update('businessShifts', [...shifts, { open: '06:00', close: '12:00', label: `Shift ${shifts.length + 1}` }]);
  };

  const updateShift = (idx: number, field: string, value: string) => {
    const shifts = [...(settings.businessShifts || [])];
    shifts[idx] = { ...shifts[idx], [field]: value };
    update('businessShifts', shifts);
  };

  const removeShift = (idx: number) => {
    const shifts = [...(settings.businessShifts || [])];
    if (shifts.length <= 1) return toast.error('At least one shift is required');
    shifts.splice(idx, 1);
    update('businessShifts', shifts);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon size={22} className="text-brand-400" /> Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">Configure your gym, payments, attendance, and notifications</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. GYM PROFILE */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Section title="Gym Profile" description="Your gym's identity and contact information" icon={<Building2 size={18} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Gym Name *</label>
            <input type="text" value={settings.gymName || ''} onChange={e => update('gymName', e.target.value)} className={inputClass} placeholder="e.g. FitZone Gym" />
          </div>
          <div>
            <label className={labelClass}>Owner Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={settings.ownerName || ''} onChange={e => update('ownerName', e.target.value)} className={`${inputClass} pl-10`} placeholder="Your full name" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone *</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="tel" value={settings.phone || ''} onChange={e => update('phone', e.target.value)} className={`${inputClass} pl-10`} placeholder="9876543210" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="email" disabled value={settings.email || ''} className={`${inputClass} pl-10 opacity-60 cursor-not-allowed`} />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">Email cannot be changed</p>
          </div>
        </div>

        {/* Business Shifts */}
        <div className="mt-6 pt-5 border-t border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock size={14} className="text-brand-400" /> Business Hours / Shifts
            </p>
            <button type="button" onClick={addShift} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 transition-all">
              <Plus size={12} /> Add Shift
            </button>
          </div>

          <div className="space-y-3">
            {(settings.businessShifts || [{ open: '06:00', close: '22:00', label: 'Full Day' }]).map((shift: any, idx: number) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="flex-1 min-w-0">
                  <label className={labelClass}>Label</label>
                  <input type="text" value={shift.label || ''} onChange={e => updateShift(idx, 'label', e.target.value)} className={inputClass} placeholder="e.g. Morning" />
                </div>
                <div className="flex-1 min-w-0">
                  <TimePicker value={shift.open} onChange={v => updateShift(idx, 'open', v)} label="Opens" />
                </div>
                <div className="flex-1 min-w-0">
                  <TimePicker value={shift.close} onChange={v => updateShift(idx, 'close', v)} label="Closes" />
                </div>
                <button
                  type="button"
                  onClick={() => removeShift(idx)}
                  className="p-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 self-end sm:mb-0.5 min-h-[44px] flex items-center justify-center"
                  title="Remove shift"
                  aria-label="Remove shift"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Working Days */}
          <div className="mt-4">
            <label className={labelClass}>Working Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map((label, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all ${
                    (settings.businessDays || []).includes(i) ? 'bg-brand-500/20 text-brand-400 border-brand-500/40' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. LOCATION & GEOFENCING */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Section title="Location & Geofencing" description="Configure gym coordinates for WhatsApp live location attendance" icon={<MapPin size={18} />} accentColor="from-purple-500/60 via-purple-400/30">
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Gym Address</label>
            <input type="text" value={settings.gymAddress || ''} onChange={e => update('gymAddress', e.target.value)} className={inputClass} placeholder="e.g. Sector 62, Noida, UP" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button type="button" onClick={handleGetLocation} disabled={locating}
              className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-50 min-h-[48px] w-full sm:w-auto">
              {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
              {locating ? 'Detecting...' : '📍 Use My Current Location'}
            </button>
            {settings.gymLat && settings.gymLon && (
              <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> {settings.gymLat}, {settings.gymLon}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Latitude</label>
              <input type="text" value={settings.gymLat ?? ''} onChange={e => update('gymLat', e.target.value ? parseFloat(e.target.value) : null)} className={inputClass} placeholder="28.4595" />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input type="text" value={settings.gymLon ?? ''} onChange={e => update('gymLon', e.target.value ? parseFloat(e.target.value) : null)} className={inputClass} placeholder="77.0263" />
            </div>
          </div>

          {/* Radius Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={labelClass + ' mb-0'}>Geofence Radius</label>
              <span className="text-sm font-bold text-white">{settings.gymRadius || 75}m</span>
            </div>
            <input type="range" min={10} max={500} step={5} value={settings.gymRadius || 75} onChange={e => update('gymRadius', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-300 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>10m (Tight)</span><span>75m (Default)</span><span>500m (Loose)</span>
            </div>
          </div>

          {!settings.gymLat && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400">Location not set. WhatsApp live location attendance won't work until you configure gym coordinates.</p>
            </div>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. PAYMENT SETTINGS */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Section title="Payment Settings" description="Default fees, currency, and grace period configuration" icon={<CreditCard size={18} />} accentColor="from-green-500/60 via-green-400/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Default Monthly Fee (₹)</label>
            <input type="text" value={settings.defaultMonthlyFee || ''} onChange={e => update('defaultMonthlyFee', parseInt(e.target.value) || 0)} className={inputClass} placeholder="500" />
            <p className="text-xs text-gray-600 mt-1">Auto-fills when adding new members</p>
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <div className="relative">
              <Dropdown
                value={settings.currency || 'INR'}
                onChange={val => update('currency', val)}
                options={[
                  { value: 'INR', label: '🇮🇳 INR (₹)' },
                  { value: 'USD', label: '🇺🇸 USD ($)' },
                  { value: 'AED', label: '🇦🇪 AED (د.إ)' }
                ]}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Grace Period (days)</label>
            <input type="text" value={settings.gracePeriodDays ?? 3} onChange={e => update('gracePeriodDays', parseInt(e.target.value) || 0)} className={inputClass} />
            <p className="text-xs text-gray-600 mt-1">Days after due date before reminders start</p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. REMINDER & NOTIFICATION SETTINGS */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Section title="Reminders & Notifications" description="Configure automatic payment reminders via WhatsApp" icon={<Bell size={18} />} accentColor="from-amber-500/60 via-amber-400/30">
        <div className="space-y-5">
          <Toggle checked={settings.reminderEnabled ?? true} onChange={v => update('reminderEnabled', v)} label="Enable Auto-Reminders" description="Automatically send payment reminders via WhatsApp" />

          {settings.reminderEnabled && (
            <>
              {/* Before Due Date */}
              <div>
                <label className={labelClass}>📅 Before Due Date (days)</label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 7, 10, 14, 21, 30].map(day => (
                    <button key={day} type="button"
                      onClick={() => {
                        const c = settings.defaultReminderDays || [];
                        update('defaultReminderDays', c.includes(day) ? c.filter((d: number) => d !== day) : [...c, day].sort((a: number, b: number) => a - b));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        (settings.defaultReminderDays || []).includes(day) ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500'
                      }`}>{day}d</button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1.5">Active: {(settings.defaultReminderDays || [1, 3, 7]).join(', ')} days before due</p>
              </div>

              {/* After Due Date */}
              <div>
                <label className={labelClass}>⚠️ After Due Date / Overdue (days)</label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 7, 10, 14, 21, 30].map(day => (
                    <button key={day} type="button"
                      onClick={() => {
                        const c = settings.afterDueReminderDays || [];
                        update('afterDueReminderDays', c.includes(day) ? c.filter((d: number) => d !== day) : [...c, day].sort((a: number, b: number) => a - b));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        (settings.afterDueReminderDays || []).includes(day) ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500'
                      }`}>{day}d</button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1.5">Active: {(settings.afterDueReminderDays || [1, 3, 7]).join(', ')} days after expiry</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TimePicker value={settings.reminderTime || '08:00'} onChange={v => update('reminderTime', v)} label="Reminder Time (IST)" />
                <div>
                  <label className={labelClass}>Reminder Language</label>
                  <div className="relative">
                    <Dropdown
                      value={settings.reminderLanguage || 'hinglish'}
                      onChange={val => update('reminderLanguage', val)}
                      options={[
                        { value: 'english', label: '🇬🇧 English' },
                        { value: 'hindi', label: '🇮🇳 Hindi' },
                        { value: 'hinglish', label: '🇮🇳 Hinglish (Mixed)' }
                      ]}
                      className={inputClass}
                    />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">Language for AI-generated reminders</p>
                </div>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. ATTENDANCE SETTINGS */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Section title="Attendance Settings" description="Check-in methods, duplicate prevention, and streak configuration" icon={<CircleDot size={18} />} accentColor="from-cyan-500/60 via-cyan-400/30">
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Allowed Check-in Methods</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'manual', label: '✋ Manual' },
                { id: 'qr-scan', label: '📸 QR Scan' },
                { id: 'whatsapp-location', label: '📍 WhatsApp Location' },
              ].map(method => (
                <button key={method.id} type="button" onClick={() => toggleMethod(method.id)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                    (settings.attendanceMethods || []).includes(method.id) ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500'
                  }`}>{method.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Duplicate Window (hours)</label>
              <input type="text" value={settings.duplicateWindowHours ?? 18} onChange={e => update('duplicateWindowHours', parseInt(e.target.value) || 18)} className={inputClass} />
              <p className="text-[10px] text-gray-600 mt-1">Minimum hours between duplicate check-ins for same member</p>
            </div>
            <div>
              <label className={labelClass}>Streak Milestones</label>
              <div className="flex gap-2 flex-wrap">
                {[7, 14, 30, 60, 100, 365].map(ms => (
                  <button key={ms} type="button"
                    onClick={() => {
                      const c = settings.streakMilestones || [];
                      update('streakMilestones', c.includes(ms) ? c.filter((m: number) => m !== ms) : [...c, ms].sort((a: number, b: number) => a - b));
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      (settings.streakMilestones || []).includes(ms) ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500'
                    }`}><Flame size={10} className="inline mr-1" />{ms}d</button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Members get a celebration message at these streaks</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. WHATSAPP SETTINGS */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Section title="WhatsApp Configuration" description="Chatbot behavior and welcome messages" icon={<MessageSquare size={18} />} accentColor="from-green-500/60 via-emerald-400/30">
        <div className="space-y-5">
          <Toggle checked={settings.autoReplyEnabled ?? true} onChange={v => update('autoReplyEnabled', v)} label="Auto-Reply Bot" description="Automatically respond to member messages on WhatsApp" />

          <div>
            <label className={labelClass}>Welcome Message Template</label>
            <textarea
              rows={3}
              value={settings.welcomeMessage || ''}
              onChange={e => update('welcomeMessage', e.target.value)}
              className={inputClass}
              style={{ resize: 'none' }}
              placeholder="Welcome to {gymName}! 💪 Send 'hi' for the menu."
            />
            <p className="text-[10px] text-gray-600 mt-1">
              Use {'{gymName}'} and {'{memberName}'} as dynamic placeholders. Sent before the menu buttons when members say hi.
            </p>
          </div>

          <div className="rounded-lg p-4 bg-gray-800/50 border border-gray-700">
            <p className="text-xs font-semibold text-gray-300 mb-2">Connection Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-400 font-medium">WhatsApp API Connected</span>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">API keys configured via environment variables (.env)</p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 7. SECURITY */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Section title="Security" description="Change your password and manage account security" icon={<Shield size={18} />} accentColor="from-red-500/60 via-red-400/30">
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className={labelClass}>Current Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} className={inputClass} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input type={showPw ? 'text' : 'password'} required minLength={6} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} className={inputClass} placeholder="At least 6 characters" />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input type={showPw ? 'text' : 'password'} required value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className={inputClass} placeholder="Re-enter new password" />
            {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>
          <button type="submit" disabled={changingPw || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 transition-all">
            <Shield size={14} /> {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </Section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FLOATING SAVE BAR */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {dirty && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-50">
          <div className="bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 px-4 sm:px-8 py-3 sm:py-4">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <p className="text-sm text-amber-400 font-medium">Unsaved changes</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { fetchSettings(); setDirty(false); }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-all min-h-[48px] sm:min-h-0">
                  <RotateCcw size={14} /> Discard
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-lg text-sm font-bold bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white transition-all shadow-lg shadow-brand-500/20 min-h-[48px] sm:min-h-0">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
