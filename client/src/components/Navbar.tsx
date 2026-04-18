import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, CalendarCheck, LogOut, FileText, Clock, Settings, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    localStorage.removeItem('gw_token');
    localStorage.removeItem('gw_owner');
    navigate('/login');
  };

  const ownerData = localStorage.getItem('gw_owner');
  const owner = ownerData ? JSON.parse(ownerData) : null;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 lg:p-6 border-b border-gray-800 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent leading-tight break-words">
            💪 {owner?.gymName || 'GymWaBot'}
          </h1>
          <p className="text-[11px] text-gray-600 mt-0.5">Powered by GymWaBot</p>
        </div>
        {/* Close button (mobile only) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[48px] ${
                isActive
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon size={18} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 lg:p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full min-h-[48px]"
        >
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile Top Bar ──────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent truncate mx-3">
            💪 {owner?.gymName || 'GymWaBot'}
          </h1>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* ── Mobile Sidebar Overlay ──────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-screen w-72 lg:w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        role="complementary"
        aria-label="Sidebar navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Navbar;
