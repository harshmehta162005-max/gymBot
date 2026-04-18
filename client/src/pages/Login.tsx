import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { MapPin, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    gymName: '',
    phone: '',
    gymAddress: '',
    gymLat: '',
    gymLon: '',
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Client Side Validation ---
    if (isRegister) {
      const phoneDigits = form.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        toast.error('Invalid mobile number. Must be exactly 10 digits.');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        toast.error('Please enter a valid email address.');
        return;
      }

      if (form.password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }
    } else {
      if (!form.email.trim() || !form.password) {
        toast.error('Email and password are required.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister
        ? {
            email: form.email,
            password: form.password,
            gymName: form.gymName,
            phone: form.phone,
            gymAddress: form.gymAddress,
            gymLat: form.gymLat ? parseFloat(form.gymLat) : null,
            gymLon: form.gymLon ? parseFloat(form.gymLon) : null,
          }
        : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);

      localStorage.setItem('gw_token', data.token);
      localStorage.setItem('gw_owner', JSON.stringify(data.owner));
      toast.success(isRegister ? 'Account created!' : 'Welcome back!');
      navigate('/');
    } catch {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm({
          ...form,
          gymLat: position.coords.latitude.toFixed(6),
          gymLon: position.coords.longitude.toFixed(6),
        });
        toast.success('📍 Location captured!');
        setLocating(false);
      },
      (error) => {
        toast.error(`Location error: ${error.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-2">
            💪 GymWaBot
          </h1>
          <p className="text-gray-500 text-sm">
            {isRegister ? 'Create your gym dashboard' : 'Sign in to your dashboard'}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Gym Name</label>
                  <input
                    type="text"
                    required
                    value={form.gymName}
                    onChange={(e) => setForm({ ...form, gymName: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. FitZone Gym"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                    placeholder="9876543210"
                  />
                </div>

                {/* Gym Location Section */}
                <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                      <MapPin size={14} className="text-brand-400" /> Gym Location
                    </p>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-all disabled:opacity-50"
                    >
                      {locating ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Locating...
                        </>
                      ) : (
                        <>
                          <MapPin size={12} /> Use My Location
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={form.gymAddress}
                      onChange={(e) => setForm({ ...form, gymAddress: e.target.value })}
                      className={inputClass}
                      placeholder="Gym address (e.g. Sector 62, Noida)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Latitude</label>
                      <input
                        type="text"
                        value={form.gymLat}
                        onChange={(e) => setForm({ ...form, gymLat: e.target.value })}
                        className={inputClass}
                        placeholder="28.4595"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Longitude</label>
                      <input
                        type="text"
                        value={form.gymLon}
                        onChange={(e) => setForm({ ...form, gymLon: e.target.value })}
                        className={inputClass}
                        placeholder="77.0263"
                      />
                    </div>
                  </div>
                  {form.gymLat && form.gymLon && (
                    <p className="text-[10px] text-green-400 flex items-center gap-1">
                      ✅ Location set: {form.gymLat}, {form.gymLon}
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="owner@gym.com"
                autoComplete={isRegister ? "off" : "email"}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
                placeholder="••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all duration-200 text-sm"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setForm({ email: '', password: '', gymName: '', phone: '', gymAddress: '', gymLat: '', gymLon: '' });
              }}
              className="text-brand-400 hover:text-brand-300 font-medium"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
